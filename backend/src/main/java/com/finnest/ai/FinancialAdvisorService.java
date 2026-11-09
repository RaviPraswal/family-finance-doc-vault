package com.finnest.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.finnest.goal.Goal;
import com.finnest.portfolio.Project;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class FinancialAdvisorService {

    private final ChatClient chatClient;

    public FinancialAdvisorService(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    public List<Recommendation> getRecommendations(List<Goal> goals, List<Project> projects) {
        BeanOutputConverter<RecommendationsWrapper> converter = new BeanOutputConverter<>(RecommendationsWrapper.class);

        String systemPrompt = """
            You are a strict, highly logical AI financial advisor. 
            Your job is to analyze the user's financial Goals and Projects, and provide smart reallocation advice.
            
            Key Rules:
            1. Priority-aware reallocation: If a high-priority goal/project is lagging, suggest reallocating funds from completed or lower-priority goals.
            2. Completed Goals: If a goal's currentAmount >= targetAmount, suggest re-routing its monthly contributions to lagging active goals/projects.
            3. New Additions: Look at the priorities. If there are many HIGH priority items, warn the user about cash-flow dilution.
            
            Return your recommendations strictly in the requested JSON format.
            The 'type' MUST be one of: REALLOCATION, WARNING, OPTIMIZATION.
            """;

        AiPayloadMinimizer.Payload payload = AiPayloadMinimizer.describe(goals, projects);
        String responseStr = chatClient.prompt()
                .system(systemPrompt)
                .user("Here is the current state of my goals and projects:\n\n" + payload.text() + "\n\nProvide recommendations.\n\n" + converter.getFormat())
                .call()
                .content();
        return converter.convert(responseStr).recommendations().stream()
                .map(r -> new Recommendation(AiPayloadMinimizer.restore(r.title(), payload.aliases()),
                        AiPayloadMinimizer.restore(r.description(), payload.aliases()), r.type()))
                .toList();
    }

    /** What the advisor screen shows: recommendations, or a short note when the AI is unavailable. */
    public record Insights(boolean available, String message, List<Recommendation> recommendations) {}

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(FinancialAdvisorService.class);

    /** Sprint 7 T9 (D-10): never fails the screen; one WARN line per failed call, no stack trace. */
    public Insights insights(List<Goal> goals, List<Project> projects) {
        try {
            return new Insights(true, null, getRecommendations(goals, projects));
        } catch (Exception e) {
            String reason = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage().lines().findFirst().orElse("");
            log.warn("AI insights unavailable: {}", reason.length() > 160 ? reason.substring(0, 160) : reason);
            return new Insights(false, "Insights unavailable today", List.of());
        }
    }

    public record Recommendation(
            @JsonProperty("title") String title,
            @JsonProperty("description") String description,
            @JsonProperty("type") String type
    ) {}

    public record RecommendationsWrapper(
            @JsonProperty("recommendations") List<Recommendation> recommendations
    ) {}
}

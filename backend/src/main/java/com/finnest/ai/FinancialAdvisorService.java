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

        String contextData = buildContextString(goals, projects);

        try {
            String responseStr = chatClient.prompt()
                    .system(systemPrompt)
                    .user("Here is the current state of my goals and projects:\n\n" + contextData + "\n\nProvide recommendations.\n\n" + converter.getFormat())
                    .call()
                    .content();

            return converter.convert(responseStr).recommendations();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate AI recommendations: " + e.getMessage(), e);
        }
    }

    private String buildContextString(List<Goal> goals, List<Project> projects) {
        StringBuilder sb = new StringBuilder();
        sb.append("--- GOALS ---\n");
        for (Goal g : goals) {
            sb.append(String.format("- %s (Category: %s, Priority: %s): Target=%.2f, Current=%.2f, Deadline=%s\n",
                    g.getName(), g.getCategory(), g.getPriority(), g.getTargetAmount(), g.getCurrentAmount(), g.getTargetDate()));
        }
        sb.append("\n--- PROJECTS ---\n");
        for (Project p : projects) {
            sb.append(String.format("- %s (Status: %s, Priority: %s): Budget=%.2f, Start=%s, End=%s\n",
                    p.getName(), p.getStatus(), p.getPriority(), p.getBudget(), p.getStartDate(), p.getEndDate()));
        }
        return sb.toString();
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

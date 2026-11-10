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
    private final java.time.Clock clock;
    /** Sprint 8: after a quota error (429), no AI call is made before this instant. */
    private volatile java.time.Instant pausedUntil = java.time.Instant.MIN;

    @org.springframework.beans.factory.annotation.Autowired
    public FinancialAdvisorService(ChatClient.Builder chatClientBuilder) {
        this(chatClientBuilder, java.time.Clock.systemUTC());
    }

    FinancialAdvisorService(ChatClient.Builder chatClientBuilder, java.time.Clock clock) {
        this.chatClient = chatClientBuilder.build();
        this.clock = clock;
    }

    private static final java.util.regex.Pattern RETRY_IN =
            java.util.regex.Pattern.compile("retry in (?:(\\d+)h)?(?:(\\d+)m)?(?:([\\d.]+)s)?");

    /** How long the provider asked us to wait ("Please retry in 19h47m8s"); one hour if it did not say. */
    static java.time.Duration quotaWait(String message) {
        java.util.regex.Matcher m = RETRY_IN.matcher(message == null ? "" : message);
        if (m.find() && (m.group(1) != null || m.group(2) != null || m.group(3) != null)) {
            long h = m.group(1) == null ? 0 : Long.parseLong(m.group(1));
            long min = m.group(2) == null ? 0 : Long.parseLong(m.group(2));
            double sec = m.group(3) == null ? 0 : Double.parseDouble(m.group(3));
            return java.time.Duration.ofHours(h).plusMinutes(min).plusSeconds((long) Math.ceil(sec));
        }
        return java.time.Duration.ofHours(1);
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
        if (clock.instant().isBefore(pausedUntil)) {
            return new Insights(false, "Insights unavailable today", List.of()); // quota used up: don't call again
        }
        try {
            return new Insights(true, null, getRecommendations(goals, projects));
        } catch (Exception e) {
            String message = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            if (message.contains("429") || message.contains("RESOURCE_EXHAUSTED")) {
                pausedUntil = clock.instant().plus(quotaWait(message));
                log.warn("AI quota used up; insights paused until {}", pausedUntil);
            } else {
                String reason = message.lines().findFirst().orElse("");
                log.warn("AI insights unavailable: {}", reason.length() > 160 ? reason.substring(0, 160) : reason);
            }
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

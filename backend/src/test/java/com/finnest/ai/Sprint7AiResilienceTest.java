package com.finnest.ai;

import com.finnest.goal.Goal;
import com.finnest.portfolio.Project;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.retry.NonTransientAiException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** Sprint 7 T9 (SPEC P0-4, D-10): AI is optional and sees as little as possible. */
class Sprint7AiResilienceTest {

    private static Goal goal(String name, int target, int current) {
        Goal g = new Goal();
        g.setName(name);
        g.setCategory("Education");
        g.setPriority("HIGH");
        g.setTargetAmount(BigDecimal.valueOf(target));
        g.setCurrentAmount(BigDecimal.valueOf(current));
        g.setTargetDate(LocalDate.now().plusMonths(17));
        return g;
    }

    private static Project project(String name, int budget) {
        Project p = new Project();
        p.setName(name);
        p.setStatus("IN_PROGRESS");
        p.setBudget(BigDecimal.valueOf(budget));
        return p;
    }

    @Test
    @DisplayName("T9: a quota error (429) gives 'unavailable', not an exception")
    void quotaErrorDegradesQuietly() {
        ChatClient client = mock(ChatClient.class, RETURNS_DEEP_STUBS);
        when(client.prompt().system(anyString()).user(anyString()).call().content())
                .thenThrow(new NonTransientAiException("429 - You exceeded your current quota"));
        ChatClient.Builder builder = mock(ChatClient.Builder.class);
        when(builder.build()).thenReturn(client);

        FinancialAdvisorService.Insights result = new FinancialAdvisorService(builder)
                .insights(List.of(goal("Tejal Sukanya top-up", 150000, 35000)), List.of());

        assertThat(result.available()).isFalse();
        assertThat(result.message()).isEqualTo("Insights unavailable today");
        assertThat(result.recommendations()).isEmpty();
    }

    @Test
    @DisplayName("T9: the prompt has no names, no long digit runs and amounts rounded to ₹1,000")
    void payloadIsMinimised() {
        AiPayloadMinimizer.Payload p = AiPayloadMinimizer.describe(
                List.of(goal("Tejal Sukanya top-up", 150400, 35600)), List.of(project("Ravi house 4521", 2512345)));

        assertThat(p.text()).contains("Goal 1").contains("Project 1").contains("150k").contains("36k").contains("2,512k");
        assertThat(p.text()).doesNotContain("Tejal").doesNotContain("Sukanya").doesNotContain("Ravi").doesNotContain("4521");
        assertThat(p.text()).doesNotContainPattern("\\d{4,}");
        assertThat(p.aliases()).containsEntry("Goal 1", "Tejal Sukanya top-up").containsEntry("Project 1", "Ravi house 4521");
    }

    @Test
    @DisplayName("T9: real names are put back into the AI's answer on the server")
    void namesRestoredServerSide() {
        String restored = AiPayloadMinimizer.restore("Move ₹5k from Goal 1 to Project 1.", Map.of("Goal 1", "Car fund", "Project 1", "Kitchen"));
        assertThat(restored).isEqualTo("Move ₹5k from Car fund to Kitchen.");
    }
}

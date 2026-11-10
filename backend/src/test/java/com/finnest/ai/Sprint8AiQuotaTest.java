package com.finnest.ai;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.retry.NonTransientAiException;
import org.springframework.ai.retry.TransientAiException;
import org.springframework.retry.support.RetryTemplate;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** Sprint 8 fix: a used-up daily AI quota must not be hammered (Ravi's log, 2026-11-09: two retries, two stack traces). */
class Sprint8AiQuotaTest {

    static final class MovableClock extends Clock {
        Instant now = Instant.parse("2026-11-09T12:00:00Z");
        @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }

    private static final String QUOTA = "429 - [{ \"error\": { \"code\": 429, \"message\": \"You exceeded your current quota ... Please retry in 19h47m8.807313791s.\" } }]";

    @Test
    @DisplayName("After a quota error the AI is not called again until the quota resets")
    void pausesUntilQuotaResets() {
        ChatClient client = mock(ChatClient.class, RETURNS_DEEP_STUBS);
        when(client.prompt().system(anyString()).user(anyString()).call().content()).thenThrow(new NonTransientAiException(QUOTA));
        ChatClient.Builder builder = mock(ChatClient.Builder.class);
        when(builder.build()).thenReturn(client);
        MovableClock clock = new MovableClock();
        FinancialAdvisorService ai = new FinancialAdvisorService(builder, clock);

        assertThat(ai.insights(List.of(), List.of()).available()).isFalse();
        assertThat(ai.insights(List.of(), List.of()).available()).isFalse();
        verify(client.prompt().system(anyString()).user(anyString()).call(), times(1)).content();

        clock.now = clock.now.plusSeconds(19 * 3600 + 48 * 60); // past "retry in 19h47m8s"
        ai.insights(List.of(), List.of());
        verify(client.prompt().system(anyString()).user(anyString()).call(), times(2)).content();
    }

    @Test
    @DisplayName("Quota and other client errors are never retried; a transient error is retried once")
    void retryPolicy() {
        RetryTemplate retry = new AiRetryConfig().retryTemplate();
        AtomicInteger calls = new AtomicInteger();
        assertThatThrownBy(() -> retry.execute(c -> { calls.incrementAndGet(); throw new NonTransientAiException(QUOTA); }))
                .isInstanceOf(NonTransientAiException.class);
        assertThat(calls.get()).isEqualTo(1);

        calls.set(0);
        assertThatThrownBy(() -> retry.execute(c -> { calls.incrementAndGet(); throw new TransientAiException("503"); }))
                .isInstanceOf(TransientAiException.class);
        assertThat(calls.get()).isEqualTo(2);
    }
}

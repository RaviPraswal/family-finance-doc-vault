package com.finnest.ai;

import org.springframework.ai.retry.TransientAiException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.support.RetryTemplate;
import org.springframework.web.client.ResourceAccessException;

import java.time.Duration;

/**
 * Sprint 8 fix (D-10): replaces Spring AI's default retry, which retried a used-up daily quota and logged a full stack
 * trace per attempt. Only transient failures (5xx, network) get one more try; quota and other client errors
 * (NonTransientAiException) are not in the list, so they are never retried.
 */
@Configuration
public class AiRetryConfig {
    @Bean
    public RetryTemplate retryTemplate() {
        return RetryTemplate.builder()
                .maxAttempts(2)
                .retryOn(TransientAiException.class)
                .retryOn(ResourceAccessException.class)
                .traversingCauses()
                .fixedBackoff(Duration.ofSeconds(2).toMillis())
                .build();
    }
}

package com.finnest.auth;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Locks an email for 15 minutes after 5 failed logins within 15 minutes.
 * Kept in memory: a restart clears it, which is acceptable for a single-instance app.
 */
@Service
public class LoginAttemptService {

    static final int MAX_FAILURES = 5;
    static final Duration WINDOW = Duration.ofMinutes(15);

    private final Map<String, Deque<Instant>> failures = new ConcurrentHashMap<>();
    private final Clock clock;

    public LoginAttemptService() {
        this(Clock.systemUTC());
    }

    LoginAttemptService(Clock clock) {
        this.clock = clock;
    }

    /** Throws 429 while the email is locked. */
    public void checkAllowed(String email) {
        Deque<Instant> recent = recentFailures(email);
        if (recent != null && recent.size() >= MAX_FAILURES) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many failed logins. Try again in 15 minutes.");
        }
    }

    public void recordFailure(String email) {
        failures.computeIfAbsent(key(email), k -> new ArrayDeque<>()).addLast(clock.instant());
    }

    public void reset(String email) {
        failures.remove(key(email));
    }

    private Deque<Instant> recentFailures(String email) {
        Deque<Instant> recent = failures.get(key(email));
        if (recent == null) {
            return null;
        }
        Instant cutoff = clock.instant().minus(WINDOW);
        synchronized (recent) {
            while (!recent.isEmpty() && recent.peekFirst().isBefore(cutoff)) {
                recent.pollFirst();
            }
        }
        return recent;
    }

    private static String key(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}

package com.finnest.ai;

import com.finnest.goal.Goal;
import com.finnest.portfolio.Project;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Sprint 7 T9 (SPEC P0-4, D-10): what the AI is allowed to see. Names never leave the server (the AI sees
 * "Goal 1", "Project 2"), amounts are rounded to ₹1,000, dates become "in N months", and long digit runs
 * (account numbers, phone numbers) are blanked. The real names are put back into the answer on the server.
 */
public final class AiPayloadMinimizer {
    public record Payload(String text, Map<String, String> aliases) {}

    private static final Pattern LONG_DIGITS = Pattern.compile("\\d{4,}");

    private AiPayloadMinimizer() {}

    public static Payload describe(List<Goal> goals, List<Project> projects) {
        Map<String, String> aliases = new LinkedHashMap<>();
        StringBuilder sb = new StringBuilder("--- GOALS ---\n");
        int i = 1;
        for (Goal g : goals) {
            String alias = "Goal " + i++;
            aliases.put(alias, g.getName());
            sb.append(String.format("- %s (category: %s, priority: %s): target %s, saved %s, due %s%n",
                    alias, clean(g.getCategory()), clean(g.getPriority()), thousands(g.getTargetAmount()),
                    thousands(g.getCurrentAmount()), when(g.getTargetDate())));
        }
        sb.append("\n--- PROJECTS ---\n");
        i = 1;
        for (Project p : projects) {
            String alias = "Project " + i++;
            aliases.put(alias, p.getName());
            sb.append(String.format("- %s (status: %s, priority: %s): budget %s, ends %s%n",
                    alias, clean(p.getStatus()), clean(p.getPriority()), thousands(p.getBudget()), when(p.getEndDate())));
        }
        return new Payload(sb.toString(), aliases);
    }

    /** Puts real names back, longest alias first so "Goal 10" is not read as "Goal 1". */
    public static String restore(String text, Map<String, String> aliases) {
        if (text == null) return null;
        String out = text;
        for (String alias : aliases.keySet().stream().sorted(Comparator.comparingInt(String::length).reversed()).toList()) {
            String name = aliases.get(alias) == null ? alias : aliases.get(alias);
            out = out.replaceAll("\\b" + Pattern.quote(alias) + "\\b", Matcher.quoteReplacement(name));
        }
        return out;
    }

    private static String thousands(BigDecimal amount) {
        if (amount == null) return "unknown";
        long k = amount.divide(BigDecimal.valueOf(1000), 0, RoundingMode.HALF_UP).longValue();
        return NumberFormat.getIntegerInstance(Locale.US).format(k) + "k";
    }

    private static String when(LocalDate date) {
        if (date == null) return "with no date";
        long months = ChronoUnit.MONTHS.between(LocalDate.now().withDayOfMonth(1), date.withDayOfMonth(1));
        return months >= 0 ? "in " + months + " months" : (-months) + " months ago";
    }

    private static String clean(String text) {
        return text == null ? "none" : LONG_DIGITS.matcher(text).replaceAll("#");
    }
}

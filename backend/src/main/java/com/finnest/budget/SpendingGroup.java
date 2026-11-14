package com.finnest.budget;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Sprint 9: the seven plain Money Out groups. Old category names are mapped by keyword, never rewritten; anything
 * unknown is "Not sorted yet" rather than guessed. Mirrors frontend/src/lib/simpleMoney.ts (spendingGroupOf) —
 * SpendingGroupTest and simpleMoney.test.ts hold the same cases; change both together.
 */
public final class SpendingGroup {

    public static final String NOT_SORTED = "Not sorted yet";

    private static final Map<String, Pattern> WORDS = new LinkedHashMap<>();
    static {
        WORDS.put("Home & bills", Pattern.compile("home|bill|\\brent|utilit|electric|water|gas|internet|wifi|broadband|mobile|recharge|maintenance|society|dth"));
        WORDS.put("Food & daily needs", Pattern.compile("food|grocer|daily|milk|vegetable|restaurant|dining|swiggy|zomato|kirana"));
        WORDS.put("Transport & travel", Pattern.compile("travel|transport|fuel|petrol|diesel|cab|taxi|uber|ola|auto|bus|train|flight|toll|parking"));
        WORDS.put("Health & insurance", Pattern.compile("health|medic|doctor|hospital|pharma|insurance|clinic|dental"));
        WORDS.put("Education & children", Pattern.compile("educat|school|college|tuition|fees|book|coaching|kids|child"));
        WORDS.put("Shopping & fun", Pattern.compile("shop|entertain|cloth|gadget|movie|netflix|subscription|fun|hobby|amazon|flipkart"));
        WORDS.put("Family & giving", Pattern.compile("famil|giving|gift|donat|charity|parent|festival|pooja|temple"));
    }

    public static final List<String> NAMES = List.copyOf(WORDS.keySet());

    private SpendingGroup() {}

    public static String of(String category) {
        String c = category == null ? "" : category.trim().toLowerCase();
        if (c.isEmpty()) return NOT_SORTED;
        for (String name : NAMES) if (name.toLowerCase().equals(c)) return name;
        for (Map.Entry<String, Pattern> e : WORDS.entrySet()) if (e.getValue().matcher(c).find()) return e.getKey();
        return NOT_SORTED;
    }
}

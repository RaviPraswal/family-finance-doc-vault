package com.finnest.common;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;

import java.io.IOException;

/** Sends account and card numbers to the browser as "****" + the last 4 digits; the full number stays in the database. */
public class MaskedNumberSerializer extends JsonSerializer<String> {

    public static final String MASK = "****";

    public static String mask(String number) {
        if (number == null) {
            return null;
        }
        String compact = number.replaceAll("\\s", "");
        return MASK + compact.substring(Math.max(0, compact.length() - 4));
    }

    /** True when a value sent back by the browser is the masked form, so the stored number must be kept. */
    public static boolean isMasked(String value) {
        return value != null && value.startsWith(MASK);
    }

    @Override
    public void serialize(String value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        gen.writeString(mask(value));
    }
}

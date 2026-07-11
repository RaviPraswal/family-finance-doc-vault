package com.finnest.ai;

import org.apache.tika.Tika;
import org.springframework.stereotype.Component;

import java.io.InputStream;

@Component
public class DocumentParser {

    private final Tika tika;

    public DocumentParser() {
        this.tika = new Tika();
        this.tika.setMaxStringLength(-1); // Don't limit string extraction length
    }

    public String extractText(InputStream inputStream) {
        try {
            return tika.parseToString(inputStream);
        } catch (Exception e) {
            System.err.println("Failed to extract text from document: " + e.getMessage());
            return "";
        }
    }
}

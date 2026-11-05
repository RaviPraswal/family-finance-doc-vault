package com.finnest.ai;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
public class DocumentParsingService {

    private final ChatClient chatClient;
    private final DocumentParser documentParser;

    public DocumentParsingService(ChatClient.Builder chatClientBuilder, DocumentParser documentParser) {
        this.chatClient = chatClientBuilder.build();
        this.documentParser = documentParser;
    }

    private static String contentType(Resource resource) {
        try (java.io.InputStream in = resource.getInputStream()) {
            return new org.apache.tika.Tika().detect(in, resource.getFilename());
        } catch (IOException e) {
            return "application/octet-stream";
        }
    }

    public ParsedScheduleResponse parseScheduleDocument(Resource documentResource) {
        BeanOutputConverter<ParsedScheduleResponse> converter = new BeanOutputConverter<>(ParsedScheduleResponse.class);

        String systemPrompt = """
            You are a financial document parser. Your goal is to extract payment schedule information from the provided document.
            The document could be an EMI schedule, a Mutual Fund SIP statement, or a Recurring Deposit (RD) passbook.
            
            Map the schedule type to one of these ReferenceType enums:
            - LOAN_EMI
            - SIP_INVESTMENT
            - RECURRING_DEPOSIT
            - CHIT_INSTALLMENT
            - MANUAL_ENTRY (anything else)
            
            Extract the institution name, a brief description, and the list of scheduled installments (amount and due date).
            
            Provide the output precisely in the requested JSON format.
            """;

        String formatInstructions = converter.getFormat();

        try {
            // Images go to the model as pictures; PDFs as their extracted text (S3-15).
            String mime = contentType(documentResource);
            String responseStr;
            if (mime.startsWith("image/")) {
                responseStr = chatClient.prompt()
                        .system(systemPrompt)
                        .user(u -> u.text("Extract the payment schedule from the attached image.\n" + formatInstructions)
                                .media(org.springframework.util.MimeTypeUtils.parseMimeType(mime), documentResource))
                        .call()
                        .content();
            } else {
                String text;
                try (java.io.InputStream in = documentResource.getInputStream()) {
                    text = documentParser.extractText(in);
                }
                responseStr = chatClient.prompt()
                        .system(systemPrompt)
                        .user("Extract the payment schedule from this document.\n" + formatInstructions
                                + "\n\nDOCUMENT TEXT:\n" + text)
                        .call()
                        .content();
            }

            return converter.convert(responseStr);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse document with AI: " + e.getMessage(), e);
        }
    }
}

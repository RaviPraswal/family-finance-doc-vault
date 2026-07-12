package com.finnest.ai;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
public class DocumentParsingService {

    private final ChatClient chatClient;

    public DocumentParsingService(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    public ParsedScheduleResponse parseScheduleDocument(Resource documentResource) {
        BeanOutputConverter<ParsedScheduleResponse> converter = new BeanOutputConverter<>(ParsedScheduleResponse.class);

        String systemPrompt = """
            You are a financial document parser. Your goal is to extract payment schedule information from the provided document.
            The document could be an EMI schedule, a Mutual Fund SIP statement, or a Recurring Deposit (RD) passbook.
            
            Map the schedule type to one of these ReferenceType enums:
            - LOAN_EMI
            - MUTUAL_FUND_SIP
            - RECURRING_DEPOSIT
            - CHIT_INSTALLMENT
            - OTHER
            
            Extract the institution name, a brief description, and the list of scheduled installments (amount and due date).
            
            Provide the output precisely in the requested JSON format.
            """;

        String formatInstructions = converter.getFormat();

        try {
            // Note: If using Gemini Vision, Spring AI supports passing Media (byte[], mimetype) in the prompt.
            // For simplicity, assuming the text has been extracted, or we pass it as a UserMessage with Media attached.
            String responseStr = chatClient.prompt()
                    .system(systemPrompt)
                    .user(u -> u.text("Extract the payment schedule from the attached document. \n" + formatInstructions)
                            // If dealing with PDFs/Images directly:
                            // .media(MimeTypeUtils.IMAGE_PNG, documentResource)
                    )
                    .call()
                    .content();

            return converter.convert(responseStr);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse document with AI: " + e.getMessage(), e);
        }
    }
}

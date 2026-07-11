package com.finnest.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finnest.document.Document;
import com.finnest.document.DocumentRepository;
import com.finnest.notification.Notification;
import com.finnest.notification.NotificationRepository;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.core.io.Resource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeTypeUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@Service
public class AiExtractionService {

    private final ChatClient chatClient;
    private final DocumentParser documentParser;
    private final DocumentRepository documentRepository;
    private final NotificationRepository notificationRepository;
    private final ObjectMapper objectMapper;

    public AiExtractionService(ChatClient.Builder chatClientBuilder,
                               DocumentParser documentParser,
                               DocumentRepository documentRepository,
                               NotificationRepository notificationRepository) {
        this.chatClient = chatClientBuilder.build();
        this.documentParser = documentParser;
        this.documentRepository = documentRepository;
        this.notificationRepository = notificationRepository;
        this.objectMapper = new ObjectMapper();
    }

    @Async
    public void processDocumentAsync(Document document, Resource resource) {
        try {
            String aiResponse;
            String systemPrompt = "Extract key information from this document. " +
                    "Return a JSON object containing any relevant data you find, such as 'issuer', 'amount', 'policyNumber', etc. " +
                    "Crucially, if you find an expiration date or validity end date, include a field named 'expiryDate' in 'YYYY-MM-DD' format. " +
                    "If no clear expiration or validity end date is mentioned in the document, you MUST omit 'expiryDate' or set it to null. Do not guess, and do not use the issue date or today's date. " +
                    "Respond with ONLY raw JSON, no markdown formatting or backticks.";

            if (document.getType().startsWith("image/")) {
                aiResponse = chatClient.prompt()
                        .user(u -> u.text(systemPrompt)
                                .media(MimeTypeUtils.parseMimeType(document.getType()), resource))
                        .call()
                        .content();
            } else {
                String extractedText = documentParser.extractText(resource.getInputStream());
                
                String fullPrompt = systemPrompt + "\n\nDOCUMENT TEXT:\n" + extractedText;
                aiResponse = chatClient.prompt()
                        .user(fullPrompt)
                        .call()
                        .content();
            }

            if (aiResponse.startsWith("```json")) {
                aiResponse = aiResponse.substring(7);
            }
            if (aiResponse.startsWith("```")) {
                aiResponse = aiResponse.substring(3);
            }
            if (aiResponse.endsWith("```")) {
                aiResponse = aiResponse.substring(0, aiResponse.length() - 3);
            }
            aiResponse = aiResponse.trim();

            Map<String, Object> extractedData = objectMapper.readValue(aiResponse, new TypeReference<Map<String, Object>>() {});
            document.setExtractedData(extractedData);

            if (extractedData.containsKey("expiryDate") && extractedData.get("expiryDate") != null) {
                try {
                    String expiryStr = (String) extractedData.get("expiryDate");
                    LocalDate expiryDate = LocalDate.parse(expiryStr);
                    document.setExpiryDate(expiryDate);

                    // Create instant notification if expiring soon
                    long daysUntil = ChronoUnit.DAYS.between(LocalDate.now(), expiryDate);
                    if (daysUntil <= 30 && daysUntil >= 0) {
                        Notification notification = new Notification();
                        notification.setTenantId(document.getTenantId());
                        notification.setMessage("Action Required: Document '" + document.getName() + "' is expiring on " + expiryDate + ".");
                        notification.setRead(false);
                        notification.setDocumentId(document.getId());
                        notification.setCreatedAt(LocalDateTime.now());
                        notificationRepository.save(notification);
                    }

                } catch (Exception e) {
                    System.err.println("Could not parse expiry date: " + extractedData.get("expiryDate"));
                }
            }

            documentRepository.save(document);
            System.out.println("AI Extraction complete for document: " + document.getName());

        } catch (Exception e) {
            System.err.println("Failed to process document with AI: " + e.getMessage());
            e.printStackTrace();
        }
    }
}

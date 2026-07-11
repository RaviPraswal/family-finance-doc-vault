package com.finnest.notification;

import com.finnest.document.Document;
import com.finnest.document.DocumentRepository;
import com.finnest.user.User;
import com.finnest.user.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class ReminderScheduler {

    private final DocumentRepository documentRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public ReminderScheduler(DocumentRepository documentRepository,
                             NotificationRepository notificationRepository,
                             UserRepository userRepository,
                             EmailService emailService) {
        this.documentRepository = documentRepository;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    // Runs every day at 8:00 AM
    @Scheduled(cron = "0 0 8 * * *")
    public void checkExpiries() {
        System.out.println("Running daily expiry check...");
        List<Document> documents = documentRepository.findAll();
        LocalDate today = LocalDate.now();

        for (Document doc : documents) {
            if (doc.getExpiryDate() != null) {
                long daysUntilExpiry = java.time.temporal.ChronoUnit.DAYS.between(today, doc.getExpiryDate());

                if (daysUntilExpiry == 30 || daysUntilExpiry == 14 || daysUntilExpiry == 3) {
                    // Create Notification
                    Notification notification = new Notification();
                    notification.setTenantId(doc.getTenantId());
                    notification.setDocumentId(doc.getId());
                    notification.setMessage("Document '" + doc.getName() + "' is expiring in " + daysUntilExpiry + " days.");
                    notificationRepository.save(notification);

                    // Send Email to the user who uploaded it
                    userRepository.findById(doc.getUploadedBy()).ifPresent(user -> {
                        emailService.sendEmail(
                                user.getEmail(),
                                "Reminder: Document Expiring Soon",
                                "Hello " + user.getName() + ",\n\n" +
                                        "Your document '" + doc.getName() + "' is expiring on " + doc.getExpiryDate() + ".\n\n" +
                                        "Please take necessary action.\n\n" +
                                        "Best,\nThe FinNest Team"
                        );
                    });
                }
            }
        }
    }
}

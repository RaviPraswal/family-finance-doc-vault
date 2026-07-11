package com.finnest.notification;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendEmail(String to, String subject, String text) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("noreply@finnest.com");
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            mailSender.send(message);
            System.out.println("Email sent successfully to: " + to);
        } catch (Exception e) {
            System.err.println("Failed to send email to " + to + ": " + e.getMessage());
        }
    }

    @Async
    public void sendDocumentEmail(String to, String subject, String text, java.nio.file.Path attachmentPath, String fileName) {
        try {
            jakarta.mail.internet.MimeMessage message = mailSender.createMimeMessage();
            org.springframework.mail.javamail.MimeMessageHelper helper = new org.springframework.mail.javamail.MimeMessageHelper(message, true);
            
            helper.setFrom("noreply@finnest.com");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text);
            
            org.springframework.core.io.FileSystemResource file = new org.springframework.core.io.FileSystemResource(attachmentPath.toFile());
            helper.addAttachment(fileName, file);
            
            mailSender.send(message);
            System.out.println("Document email sent successfully to: " + to);
        } catch (Exception e) {
            System.err.println("Failed to send document email to " + to + ": " + e.getMessage());
            e.printStackTrace();
        }
    }
}

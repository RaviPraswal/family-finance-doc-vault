package com.finnest.scheduler;

import com.finnest.transaction.BankTransactionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class PaymentSchedulerService {

    private static final Logger logger = LoggerFactory.getLogger(PaymentSchedulerService.class);

    private final ScheduledPaymentRepository scheduledPaymentRepository;
    private final BankTransactionService bankTransactionService;

    public PaymentSchedulerService(ScheduledPaymentRepository scheduledPaymentRepository,
                                   BankTransactionService bankTransactionService) {
        this.scheduledPaymentRepository = scheduledPaymentRepository;
        this.bankTransactionService = bankTransactionService;
    }

    // Runs every day at 1 AM
    @Scheduled(cron = "0 0 1 * * ?")
    public void processDuePayments() {
        logger.info("Starting scheduled payment processing job...");

        LocalDate today = LocalDate.now();
        List<ScheduledPayment> duePayments = scheduledPaymentRepository.findByStatusAndDueDateLessThanEqual(
                ScheduledPaymentStatus.PENDING, today);

        logger.info("Found {} payments due for processing.", duePayments.size());

        for (ScheduledPayment payment : duePayments) {
            try {
                // In a full implementation, this would trigger a push notification, email, or in-app notification entity.
                logger.info("REMINDER: Payment ID {} for {} {} is due today. Waiting for user manual approval.", 
                    payment.getId(), payment.getReferenceType(), payment.getAmount());
            } catch (Exception e) {
                logger.error("Failed to generate reminder for payment ID: " + payment.getId(), e);
            }
        }

        logger.info("Scheduled payment reminder job completed.");
    }
}

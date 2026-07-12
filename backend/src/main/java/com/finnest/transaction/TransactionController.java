package com.finnest.transaction;

import com.finnest.scheduler.ScheduledPayment;
import com.finnest.scheduler.ScheduledPaymentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final BankTransactionService bankTransactionService;
    private final ScheduledPaymentRepository scheduledPaymentRepository;

    public TransactionController(BankTransactionService bankTransactionService,
                                 ScheduledPaymentRepository scheduledPaymentRepository) {
        this.bankTransactionService = bankTransactionService;
        this.scheduledPaymentRepository = scheduledPaymentRepository;
    }

    @PostMapping("/process-scheduled/{paymentId}")
    public ResponseEntity<?> processScheduledPaymentManually(@PathVariable UUID paymentId) {
        // ... (existing code for this) ...
        Optional<ScheduledPayment> paymentOpt = scheduledPaymentRepository.findById(paymentId);
        if (paymentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        ScheduledPayment payment = paymentOpt.get();

        // Ensure it hasn't been processed yet
        if (payment.getStatus() == com.finnest.scheduler.ScheduledPaymentStatus.PROCESSED) {
            return ResponseEntity.badRequest().body("Payment has already been processed.");
        }

        try {
            bankTransactionService.processScheduledPayment(payment);
            
            // Check if it failed during processing (e.g., insufficient funds)
            if (payment.getStatus() == com.finnest.scheduler.ScheduledPaymentStatus.FAILED) {
                return ResponseEntity.badRequest().body(payment.getFailureReason());
            }

            return ResponseEntity.ok("Payment processed successfully.");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to process payment: " + e.getMessage());
        }
    }

    @GetMapping("/scheduled/pending")
    public ResponseEntity<?> getPendingScheduledPayments() {
        // Just return all pending for the mock/simplicity, 
        // in real life we would filter by TenantId
        java.util.List<ScheduledPayment> payments = scheduledPaymentRepository.findAll()
            .stream()
            .filter(p -> p.getStatus() == com.finnest.scheduler.ScheduledPaymentStatus.PENDING)
            .sorted(java.util.Comparator.comparing(ScheduledPayment::getDueDate))
            .toList();
        return ResponseEntity.ok(payments);
    }
}

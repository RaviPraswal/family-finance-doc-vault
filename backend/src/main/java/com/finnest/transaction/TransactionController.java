package com.finnest.transaction;

import com.finnest.common.TenantGuard;
import com.finnest.scheduler.ScheduledPayment;
import com.finnest.scheduler.ScheduledPaymentRepository;
import com.finnest.scheduler.ScheduledPaymentStatus;
import com.finnest.user.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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
    public ResponseEntity<?> processScheduledPaymentManually(@PathVariable UUID paymentId,
                                                             @AuthenticationPrincipal User user) {
        ScheduledPayment payment = TenantGuard.owned(scheduledPaymentRepository.findById(paymentId));
        if ("MEMBER".equals(user.getRole()) && !user.getId().equals(payment.getUserId())) {
            throw new RuntimeException("Unauthorized");
        }
        if (payment.getStatus() == ScheduledPaymentStatus.PROCESSED) {
            return ResponseEntity.badRequest().body("Payment has already been processed.");
        }
        if (payment.getStatus() == ScheduledPaymentStatus.CANCELLED) {
            return ResponseEntity.badRequest().body("This payment was cancelled.");
        }

        bankTransactionService.processScheduledPayment(payment);

        if (payment.getStatus() == ScheduledPaymentStatus.FAILED) {
            return ResponseEntity.badRequest().body(payment.getFailureReason());
        }
        return ResponseEntity.ok("Payment processed successfully.");
    }

    @GetMapping("/scheduled/pending")
    public ResponseEntity<List<ScheduledPayment>> getPendingScheduledPayments(@AuthenticationPrincipal User user) {
        List<ScheduledPayment> payments = scheduledPaymentRepository
                .findAllByTenantIdAndStatusOrderByDueDateAsc(TenantGuard.currentTenant(), ScheduledPaymentStatus.PENDING);
        if ("MEMBER".equals(user.getRole())) {
            payments = payments.stream().filter(p -> user.getId().equals(p.getUserId())).toList();
        }
        return ResponseEntity.ok(payments);
    }
}

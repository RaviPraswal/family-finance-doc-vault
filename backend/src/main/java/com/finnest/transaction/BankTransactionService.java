package com.finnest.transaction;

import com.finnest.portfolio.BankAccount;
import com.finnest.portfolio.BankAccountRepository;
import com.finnest.scheduler.ScheduledPayment;
import com.finnest.scheduler.ScheduledPaymentStatus;
import com.finnest.transaction.events.PaymentFailedEvent;
import com.finnest.transaction.events.PaymentProcessedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class BankTransactionService {

    private final BankTransactionRepository bankTransactionRepository;
    private final BankAccountRepository bankAccountRepository;
    private final ApplicationEventPublisher eventPublisher;

    public BankTransactionService(BankTransactionRepository bankTransactionRepository,
                                  BankAccountRepository bankAccountRepository,
                                  ApplicationEventPublisher eventPublisher) {
        this.bankTransactionRepository = bankTransactionRepository;
        this.bankAccountRepository = bankAccountRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public void processScheduledPayment(ScheduledPayment payment) {
        BankAccount account = payment.getBankAccount();
        
        if (payment.getTransactionType() == TransactionType.DEBIT) {
            // Check balance
            if (account.getCurrentBalance().compareTo(payment.getAmount()) < 0) {
                payment.setStatus(ScheduledPaymentStatus.FAILED);
                payment.setFailureReason("Insufficient balance");
                eventPublisher.publishEvent(new PaymentFailedEvent(payment, "Insufficient balance"));
                return;
            }
            // Deduct balance
            account.setCurrentBalance(account.getCurrentBalance().subtract(payment.getAmount()));
        } else {
            // Add balance
            account.setCurrentBalance(account.getCurrentBalance().add(payment.getAmount()));
        }

        // Save account
        bankAccountRepository.save(account);

        // Create transaction ledger entry
        BankTransaction transaction = new BankTransaction();
        transaction.setBankAccount(account);
        transaction.setAmount(payment.getAmount());
        transaction.setType(payment.getTransactionType());
        transaction.setReferenceType(payment.getReferenceType());
        transaction.setReferenceId(payment.getReferenceId());
        transaction.setDescription(payment.getDescription());
        
        bankTransactionRepository.save(transaction);

        // Update payment status
        payment.setStatus(ScheduledPaymentStatus.PROCESSED);
        payment.setFailureReason(null);

        // Publish event for specific modules (Loan, Chit, etc.) to update their records
        eventPublisher.publishEvent(new PaymentProcessedEvent(payment, transaction));
    }
}

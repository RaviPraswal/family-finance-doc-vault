package com.finnest.transaction;

import com.finnest.expense.Expense;
import com.finnest.expense.ExpenseController;
import com.finnest.expense.ExpenseRepository;
import com.finnest.portfolio.BankAccount;
import com.finnest.portfolio.ShownBalance;
import com.finnest.scheduler.ScheduledPayment;
import com.finnest.scheduler.ScheduledPaymentStatus;
import com.finnest.transaction.events.PaymentFailedEvent;
import com.finnest.transaction.events.PaymentProcessedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Pays a scheduled payment by posting it to the ledger as an ordinary entry (ADR-001, Sprint 3 S3-10),
 * so the shown bank balance, loan split, chit and RD counts, budgets and cockpit all see it.
 * bank_transactions is no longer written; old rows stay for history.
 */
@Service
public class BankTransactionService {

    private final ExpenseController ledger;
    private final ExpenseRepository expenseRepository;
    private final ApplicationEventPublisher eventPublisher;

    public BankTransactionService(ExpenseController ledger,
                                  ExpenseRepository expenseRepository,
                                  ApplicationEventPublisher eventPublisher) {
        this.ledger = ledger;
        this.expenseRepository = expenseRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public void processScheduledPayment(ScheduledPayment payment) {
        BankAccount account = payment.getBankAccount();

        if (payment.getTransactionType() == TransactionType.DEBIT) {
            var shown = ShownBalance.of(account, expenseRepository.findAllByLinkedAccountId(account.getId()));
            if (shown.compareTo(payment.getAmount()) < 0) {
                payment.setStatus(ScheduledPaymentStatus.FAILED);
                payment.setFailureReason("Insufficient balance");
                eventPublisher.publishEvent(new PaymentFailedEvent(payment, "Insufficient balance"));
                return;
            }
        }

        ledger.create(toLedgerEntry(payment));

        payment.setStatus(ScheduledPaymentStatus.PROCESSED);
        payment.setFailureReason(null);

        // Listeners only schedule the next installment; the ledger entry already updated the linked record.
        eventPublisher.publishEvent(new PaymentProcessedEvent(payment, null));
    }

    private static Expense toLedgerEntry(ScheduledPayment payment) {
        Expense e = new Expense();
        e.setAmount(payment.getAmount());
        e.setType(payment.getTransactionType().name());
        e.setExpenseDate(payment.getDueDate() != null ? payment.getDueDate() : LocalDate.now());
        e.setDescription(payment.getDescription());
        e.setLinkedAccount(payment.getBankAccount());

        ReferenceType ref = payment.getReferenceType();
        UUID id = payment.getReferenceId();
        switch (ref == null ? ReferenceType.MANUAL_ENTRY : ref) {
            case LOAN_EMI -> {
                e.setCategory("Loan EMI");
                e.setMadeAgainst("LOAN_EMI");
                e.setLinkedLoan(stub(new com.finnest.portfolio.Loan(), id));
            }
            case CHIT_INSTALLMENT -> {
                e.setCategory("Chit Fund Installment");
                e.setMadeAgainst("CHIT_INSTALLMENT");
                e.setLinkedChitFund(stub(new com.finnest.portfolio.ChitFund(), id));
            }
            case RECURRING_DEPOSIT -> {
                e.setCategory("Investment");
                e.setMadeAgainst("RECURRING_DEPOSIT");
                e.setLinkedDeposit(stub(new com.finnest.portfolio.Deposit(), id));
            }
            case SIP_INVESTMENT -> {
                e.setCategory("Investment");
                e.setMadeAgainst("SIP_INVESTMENT");
                e.setLinkedInvestment(stub(new com.finnest.portfolio.Investment(), id));
            }
            default -> {
                e.setCategory("Bills");
                e.setMadeAgainst("MANUAL_ENTRY");
            }
        }
        return e;
    }

    private static <T extends com.finnest.common.BaseEntity> T stub(T entity, UUID id) {
        if (id == null) return null;
        entity.setId(id);
        return entity;
    }
}

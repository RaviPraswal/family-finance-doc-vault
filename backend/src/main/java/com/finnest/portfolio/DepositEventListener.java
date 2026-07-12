package com.finnest.portfolio;

import com.finnest.scheduler.ScheduledPayment;
import com.finnest.scheduler.ScheduledPaymentRepository;
import com.finnest.scheduler.ScheduledPaymentStatus;
import com.finnest.transaction.ReferenceType;
import com.finnest.transaction.events.PaymentProcessedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Component
public class DepositEventListener {

    private final DepositRepository depositRepository;
    private final ScheduledPaymentRepository scheduledPaymentRepository;

    public DepositEventListener(DepositRepository depositRepository, ScheduledPaymentRepository scheduledPaymentRepository) {
        this.depositRepository = depositRepository;
        this.scheduledPaymentRepository = scheduledPaymentRepository;
    }

    @EventListener
    @Transactional
    public void onPaymentProcessed(PaymentProcessedEvent event) {
        ScheduledPayment payment = event.getScheduledPayment();
        
        if (payment.getReferenceType() == ReferenceType.RECURRING_DEPOSIT) {
            Optional<Deposit> depositOpt = depositRepository.findById(payment.getReferenceId());
            if (depositOpt.isPresent()) {
                Deposit deposit = depositOpt.get();
                
                // Update Total Deposited
                if (deposit.getTotalDeposited() != null) {
                    deposit.setTotalDeposited(deposit.getTotalDeposited().add(payment.getAmount()));
                } else {
                    deposit.setTotalDeposited(payment.getAmount());
                }

                depositRepository.save(deposit);

                // If RD hasn't matured based on date, schedule the next deposit
                if (deposit.getMaturityDate() != null && payment.getDueDate().plusMonths(1).isBefore(deposit.getMaturityDate())) {
                    ScheduledPayment nextPayment = new ScheduledPayment();
                    nextPayment.setAmount(deposit.getMonthlyDepositAmount() != null ? deposit.getMonthlyDepositAmount() : payment.getAmount());
                    nextPayment.setTransactionType(payment.getTransactionType()); // Usually DEBIT from Bank to RD
                    nextPayment.setReferenceType(ReferenceType.RECURRING_DEPOSIT);
                    nextPayment.setReferenceId(deposit.getId());
                    nextPayment.setBankAccount(payment.getBankAccount());
                    nextPayment.setDueDate(payment.getDueDate().plusMonths(1));
                    nextPayment.setStatus(ScheduledPaymentStatus.PENDING);
                    nextPayment.setDescription("Auto-scheduled installment for RD: " + deposit.getInstitution());
                    
                    scheduledPaymentRepository.save(nextPayment);
                }
            }
        }
    }
}

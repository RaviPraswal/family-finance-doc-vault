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
public class LoanEventListener {

    private final LoanRepository loanRepository;
    private final ScheduledPaymentRepository scheduledPaymentRepository;

    public LoanEventListener(LoanRepository loanRepository, ScheduledPaymentRepository scheduledPaymentRepository) {
        this.loanRepository = loanRepository;
        this.scheduledPaymentRepository = scheduledPaymentRepository;
    }

    @EventListener
    @Transactional
    public void onPaymentProcessed(PaymentProcessedEvent event) {
        ScheduledPayment payment = event.getScheduledPayment();
        
        if (payment.getReferenceType() == ReferenceType.LOAN_EMI) {
            Optional<Loan> loanOpt = loanRepository.findById(payment.getReferenceId());
            if (loanOpt.isPresent()) {
                Loan loan = loanOpt.get();
                
                // Update Outstanding Balance
                if (loan.getOutstandingAmount() != null) {
                    loan.setOutstandingAmount(loan.getOutstandingAmount().subtract(payment.getAmount()));
                }

                // Update Remaining Tenure
                if (loan.getRemainingTenure() != null && loan.getRemainingTenure() > 0) {
                    loan.setRemainingTenure(loan.getRemainingTenure() - 1);
                }

                loanRepository.save(loan);

                // If loan is not finished, schedule the next EMI
                if (loan.getRemainingTenure() != null && loan.getRemainingTenure() > 0) {
                    ScheduledPayment nextPayment = new ScheduledPayment();
                    nextPayment.setAmount(loan.getEmiAmount());
                    nextPayment.setTransactionType(payment.getTransactionType());
                    nextPayment.setReferenceType(ReferenceType.LOAN_EMI);
                    nextPayment.setReferenceId(loan.getId());
                    nextPayment.setBankAccount(payment.getBankAccount());
                    nextPayment.setDueDate(payment.getDueDate().plusMonths(1));
                    nextPayment.setStatus(ScheduledPaymentStatus.PENDING);
                    nextPayment.setDescription("Auto-scheduled EMI for Loan: " + loan.getLenderName());
                    
                    scheduledPaymentRepository.save(nextPayment);
                }
            }
        }
    }
}

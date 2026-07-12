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
public class ChitFundEventListener {

    private final ChitFundRepository chitFundRepository;
    private final ScheduledPaymentRepository scheduledPaymentRepository;

    public ChitFundEventListener(ChitFundRepository chitFundRepository, ScheduledPaymentRepository scheduledPaymentRepository) {
        this.chitFundRepository = chitFundRepository;
        this.scheduledPaymentRepository = scheduledPaymentRepository;
    }

    @EventListener
    @Transactional
    public void onPaymentProcessed(PaymentProcessedEvent event) {
        ScheduledPayment payment = event.getScheduledPayment();
        
        if (payment.getReferenceType() == ReferenceType.CHIT_INSTALLMENT) {
            Optional<ChitFund> chitOpt = chitFundRepository.findById(payment.getReferenceId());
            if (chitOpt.isPresent()) {
                ChitFund chit = chitOpt.get();
                
                // Update Pending Installments
                if (chit.getPendingInstallments() != null && chit.getPendingInstallments() > 0) {
                    chit.setPendingInstallments(chit.getPendingInstallments() - 1);
                }

                chitFundRepository.save(chit);

                // If chit is not finished, schedule the next installment
                if (chit.getPendingInstallments() != null && chit.getPendingInstallments() > 0) {
                    ScheduledPayment nextPayment = new ScheduledPayment();
                    nextPayment.setAmount(chit.getMonthlyInstallment());
                    nextPayment.setTransactionType(payment.getTransactionType());
                    nextPayment.setReferenceType(ReferenceType.CHIT_INSTALLMENT);
                    nextPayment.setReferenceId(chit.getId());
                    nextPayment.setBankAccount(payment.getBankAccount());
                    nextPayment.setDueDate(payment.getDueDate().plusMonths(1));
                    nextPayment.setStatus(ScheduledPaymentStatus.PENDING);
                    nextPayment.setDescription("Auto-scheduled installment for Chit Fund: " + chit.getOrganizerName());
                    
                    scheduledPaymentRepository.save(nextPayment);
                }
            }
        }
    }
}

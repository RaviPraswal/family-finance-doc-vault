package com.finnest.transaction.events;

import com.finnest.scheduler.ScheduledPayment;
import com.finnest.transaction.BankTransaction;

public class PaymentProcessedEvent {
    private final ScheduledPayment scheduledPayment;
    private final BankTransaction bankTransaction;

    public PaymentProcessedEvent(ScheduledPayment scheduledPayment, BankTransaction bankTransaction) {
        this.scheduledPayment = scheduledPayment;
        this.bankTransaction = bankTransaction;
    }

    public ScheduledPayment getScheduledPayment() {
        return scheduledPayment;
    }

    public BankTransaction getBankTransaction() {
        return bankTransaction;
    }
}

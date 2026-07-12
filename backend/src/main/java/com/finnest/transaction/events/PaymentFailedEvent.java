package com.finnest.transaction.events;

import com.finnest.scheduler.ScheduledPayment;

public class PaymentFailedEvent {
    private final ScheduledPayment scheduledPayment;
    private final String reason;

    public PaymentFailedEvent(ScheduledPayment scheduledPayment, String reason) {
        this.scheduledPayment = scheduledPayment;
        this.reason = reason;
    }

    public ScheduledPayment getScheduledPayment() {
        return scheduledPayment;
    }

    public String getReason() {
        return reason;
    }
}

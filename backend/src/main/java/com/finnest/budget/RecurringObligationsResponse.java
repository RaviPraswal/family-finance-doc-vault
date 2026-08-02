package com.finnest.budget;

import com.finnest.scheduler.ScheduledPayment;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class RecurringObligationsResponse {
    private BigDecimal totalOutgoing;
    private Map<String, BigDecimal> breakdown;
    private List<ScheduledPayment> obligations;

    // Getters and Setters
    public BigDecimal getTotalOutgoing() {
        return totalOutgoing;
    }

    public void setTotalOutgoing(BigDecimal totalOutgoing) {
        this.totalOutgoing = totalOutgoing;
    }

    public Map<String, BigDecimal> getBreakdown() {
        return breakdown;
    }

    public void setBreakdown(Map<String, BigDecimal> breakdown) {
        this.breakdown = breakdown;
    }

    public List<ScheduledPayment> getObligations() {
        return obligations;
    }

    public void setObligations(List<ScheduledPayment> obligations) {
        this.obligations = obligations;
    }
}

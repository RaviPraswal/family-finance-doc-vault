package com.finnest.portfolio;

import com.finnest.common.TenantBaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "investments")
public class Investment extends TenantBaseEntity {

    private String type; // Mutual Fund, Stocks, Gold, Real Estate
    private String name;
    private String ownerName;
    private BigDecimal investedAmount;
    private BigDecimal currentValue;

    // Sprint 6 (S6-04): what a scheduled investment (Sukanya Samriddhi) is projected from.
    private java.time.LocalDate startDate;
    private BigDecimal yearlyContribution;
    private Double interestRate;

    public java.time.LocalDate getStartDate() { return startDate; }
    public void setStartDate(java.time.LocalDate startDate) { this.startDate = startDate; }
    public BigDecimal getYearlyContribution() { return yearlyContribution; }
    public void setYearlyContribution(BigDecimal yearlyContribution) { this.yearlyContribution = yearlyContribution; }
    public Double getInterestRate() { return interestRate; }
    public void setInterestRate(Double interestRate) { this.interestRate = interestRate; }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public void setOwnerName(String ownerName) {
        this.ownerName = ownerName;
    }

    public BigDecimal getInvestedAmount() {
        return investedAmount;
    }

    public void setInvestedAmount(BigDecimal investedAmount) {
        this.investedAmount = investedAmount;
    }

    public BigDecimal getCurrentValue() {
        return currentValue;
    }

    public void setCurrentValue(BigDecimal currentValue) {
        this.currentValue = currentValue;
    }
}

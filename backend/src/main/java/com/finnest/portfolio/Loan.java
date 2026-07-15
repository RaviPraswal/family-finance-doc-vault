package com.finnest.portfolio;

import com.finnest.common.TenantBaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "loans")
public class Loan extends TenantBaseEntity {

    private String lenderName;
    private String loanType; // Home, Auto, Personal
    private String borrowerName;
    private BigDecimal principalAmount;
    private BigDecimal outstandingAmount;
    private BigDecimal emiAmount;
    private Double interestRate;
    private Integer remainingTenure; // In months

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @jakarta.persistence.ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
    @jakarta.persistence.JoinColumn(name = "linked_bank_account_id")
    private com.finnest.portfolio.BankAccount linkedAccount;

    public com.finnest.portfolio.BankAccount getLinkedAccount() {
        return linkedAccount;
    }

    public void setLinkedAccount(com.finnest.portfolio.BankAccount linkedAccount) {
        this.linkedAccount = linkedAccount;
    }

    public String getLenderName() {
        return lenderName;
    }

    public void setLenderName(String lenderName) {
        this.lenderName = lenderName;
    }

    public String getLoanType() {
        return loanType;
    }

    public void setLoanType(String loanType) {
        this.loanType = loanType;
    }

    public String getBorrowerName() {
        return borrowerName;
    }

    public void setBorrowerName(String borrowerName) {
        this.borrowerName = borrowerName;
    }

    public BigDecimal getPrincipalAmount() {
        return principalAmount;
    }

    public void setPrincipalAmount(BigDecimal principalAmount) {
        this.principalAmount = principalAmount;
    }

    public BigDecimal getOutstandingAmount() {
        return outstandingAmount;
    }

    public void setOutstandingAmount(BigDecimal outstandingAmount) {
        this.outstandingAmount = outstandingAmount;
    }

    public BigDecimal getEmiAmount() {
        return emiAmount;
    }

    public void setEmiAmount(BigDecimal emiAmount) {
        this.emiAmount = emiAmount;
    }

    public Double getInterestRate() {
        return interestRate;
    }

    public void setInterestRate(Double interestRate) {
        this.interestRate = interestRate;
    }

    public Integer getRemainingTenure() {
        return remainingTenure;
    }

    public void setRemainingTenure(Integer remainingTenure) {
        this.remainingTenure = remainingTenure;
    }
}

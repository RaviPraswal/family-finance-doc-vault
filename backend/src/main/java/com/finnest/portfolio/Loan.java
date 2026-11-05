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

    // Sprint 5 (S5-03): what the EMI schedule is built from, as printed on the bank's loan statement.
    private Integer tenureMonths;
    private java.time.LocalDate firstEmiDate;
    private java.time.LocalDate disbursementDate;
    /** EMIs already paid before the family started recording them in FinNest. */
    private Integer paidInstallmentsOpening;
    /** Foreclosure charge, percent of the outstanding principal. */
    private Double foreclosureRate;
    /** EMIs that must be paid before the loan can be closed early. */
    private Integer foreclosureLockInMonths;

    public Integer getTenureMonths() { return tenureMonths; }
    public void setTenureMonths(Integer tenureMonths) { this.tenureMonths = tenureMonths; }
    public java.time.LocalDate getFirstEmiDate() { return firstEmiDate; }
    public void setFirstEmiDate(java.time.LocalDate firstEmiDate) { this.firstEmiDate = firstEmiDate; }
    public java.time.LocalDate getDisbursementDate() { return disbursementDate; }
    public void setDisbursementDate(java.time.LocalDate disbursementDate) { this.disbursementDate = disbursementDate; }
    public Integer getPaidInstallmentsOpening() { return paidInstallmentsOpening; }
    public void setPaidInstallmentsOpening(Integer paidInstallmentsOpening) { this.paidInstallmentsOpening = paidInstallmentsOpening; }
    public Double getForeclosureRate() { return foreclosureRate; }
    public void setForeclosureRate(Double foreclosureRate) { this.foreclosureRate = foreclosureRate; }
    public Integer getForeclosureLockInMonths() { return foreclosureLockInMonths; }
    public void setForeclosureLockInMonths(Integer foreclosureLockInMonths) { this.foreclosureLockInMonths = foreclosureLockInMonths; }

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

    /** MONTHLY (default) or DAILY_365. See LoanMath. */
    @jakarta.persistence.Column(length = 20)
    private String interestMethod;

    public String getInterestMethod() { return interestMethod == null ? LoanMath.MONTHLY : interestMethod; }
    /** Anything other than DAILY_365 is stored as MONTHLY, so a typo cannot silently change the maths. */
    public void setInterestMethod(String interestMethod) {
        this.interestMethod = LoanMath.DAILY_365.equalsIgnoreCase(interestMethod) ? LoanMath.DAILY_365 : LoanMath.MONTHLY;
    }
}

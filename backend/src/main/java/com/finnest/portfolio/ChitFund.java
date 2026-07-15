package com.finnest.portfolio;

import com.finnest.common.TenantBaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "chit_funds")
public class ChitFund extends TenantBaseEntity {

    private String organizerName;
    private String memberName;
    private BigDecimal totalValue;
    private BigDecimal monthlyInstallment;
    private Integer durationMonths;
    private Integer pendingInstallments;
    private LocalDate startDate;

    private Boolean isAllotted = false;
    private BigDecimal allottedAmount;

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @jakarta.persistence.ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
    @jakarta.persistence.JoinColumn(name = "linked_bank_account_id")
    private com.finnest.portfolio.BankAccount linkedAccount;

    public Boolean getIsAllotted() {
        return isAllotted;
    }

    public void setIsAllotted(Boolean isAllotted) {
        this.isAllotted = isAllotted;
    }

    public BigDecimal getAllottedAmount() {
        return allottedAmount;
    }

    public void setAllottedAmount(BigDecimal allottedAmount) {
        this.allottedAmount = allottedAmount;
    }

    public com.finnest.portfolio.BankAccount getLinkedAccount() {
        return linkedAccount;
    }

    public void setLinkedAccount(com.finnest.portfolio.BankAccount linkedAccount) {
        this.linkedAccount = linkedAccount;
    }

    public String getOrganizerName() {
        return organizerName;
    }

    public void setOrganizerName(String organizerName) {
        this.organizerName = organizerName;
    }

    public String getMemberName() {
        return memberName;
    }

    public void setMemberName(String memberName) {
        this.memberName = memberName;
    }

    public BigDecimal getTotalValue() {
        return totalValue;
    }

    public void setTotalValue(BigDecimal totalValue) {
        this.totalValue = totalValue;
    }

    public BigDecimal getMonthlyInstallment() {
        return monthlyInstallment;
    }

    public void setMonthlyInstallment(BigDecimal monthlyInstallment) {
        this.monthlyInstallment = monthlyInstallment;
    }

    public Integer getDurationMonths() {
        return durationMonths;
    }

    public void setDurationMonths(Integer durationMonths) {
        this.durationMonths = durationMonths;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public Integer getPendingInstallments() {
        return pendingInstallments;
    }

    public void setPendingInstallments(Integer pendingInstallments) {
        this.pendingInstallments = pendingInstallments;
    }
}

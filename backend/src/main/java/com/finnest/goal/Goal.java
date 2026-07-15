package com.finnest.goal;

import com.finnest.common.TenantBaseEntity;
import com.finnest.portfolio.BankAccount;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "goals")
public class Goal extends TenantBaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private BigDecimal targetAmount;

    @Column(nullable = false)
    private BigDecimal currentAmount = BigDecimal.ZERO;

    @Column(nullable = false)
    private LocalDate targetDate;

    @Column
    private String category;

    @Column(nullable = false)
    private String priority = "MEDIUM"; // HIGH, MEDIUM, LOW

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_bank_account_id")
    private BankAccount linkedAccount;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public BigDecimal getTargetAmount() {
        return targetAmount;
    }

    public void setTargetAmount(BigDecimal targetAmount) {
        this.targetAmount = targetAmount;
    }

    public BigDecimal getCurrentAmount() {
        return currentAmount;
    }

    public void setCurrentAmount(BigDecimal currentAmount) {
        this.currentAmount = currentAmount;
    }

    public LocalDate getTargetDate() {
        return targetDate;
    }

    public void setTargetDate(LocalDate targetDate) {
        this.targetDate = targetDate;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public BankAccount getLinkedAccount() {
        return linkedAccount;
    }

    public void setLinkedAccount(BankAccount linkedAccount) {
        this.linkedAccount = linkedAccount;
    }
}

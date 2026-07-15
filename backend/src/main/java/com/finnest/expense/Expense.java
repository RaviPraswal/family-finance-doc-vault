package com.finnest.expense;

import com.finnest.common.TenantBaseEntity;
import com.finnest.portfolio.BankAccount;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "expenses")
public class Expense extends TenantBaseEntity {

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private LocalDate expenseDate;

    @Column(length = 500)
    private String description;

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_bank_account_id")
    private BankAccount linkedAccount;

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public LocalDate getExpenseDate() {
        return expenseDate;
    }

    public void setExpenseDate(LocalDate expenseDate) {
        this.expenseDate = expenseDate;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BankAccount getLinkedAccount() {
        return linkedAccount;
    }

    public void setLinkedAccount(BankAccount linkedAccount) {
        this.linkedAccount = linkedAccount;
    }
}

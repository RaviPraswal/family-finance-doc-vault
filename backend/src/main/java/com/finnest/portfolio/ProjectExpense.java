package com.finnest.portfolio;

import com.finnest.common.TenantBaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import com.finnest.portfolio.Project;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "project_expenses")
public class ProjectExpense extends TenantBaseEntity {
    @ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
    private Project project;
    private LocalDate date;
    private BigDecimal amount;
    private String description;
    private String category;

    @ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
    @jakarta.persistence.JoinColumn(name = "expense_id")
    private com.finnest.expense.Expense expense;

    public Project getProject() {
        return project;
    }
    public void setProject(Project project) {
        this.project = project;
    }
    public LocalDate getDate() {
        return date;
    }
    public void setDate(LocalDate date) {
        this.date = date;
    }
    public BigDecimal getAmount() {
        return amount;
    }
    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }
    public String getDescription() {
        return description;
    }
    public void setDescription(String description) {
        this.description = description;
    }
    public String getCategory() {
        return category;
    }
    public void setCategory(String category) {
        this.category = category;
    }
    public com.finnest.expense.Expense getExpense() {
        return expense;
    }
    public void setExpense(com.finnest.expense.Expense expense) {
        this.expense = expense;
    }
}

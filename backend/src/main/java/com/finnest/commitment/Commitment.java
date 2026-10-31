package com.finnest.commitment;

import com.finnest.common.TenantBaseEntity;
import com.finnest.portfolio.ChitFund;
import com.finnest.portfolio.Loan;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * A recurring line of the monthly plan: salary, EMI, rent, SIP, chit, milk, bills.
 * Mirrors the "MONTHLY EXPENSES" sheet: amount + frequency + ACTIVE/PAUSED, grouped
 * into income / must-pay / living / pause-able so the month's headroom can be computed.
 */
@Entity
@Table(name = "commitments")
public class Commitment extends TenantBaseEntity {

    public enum Group { INCOME, MUST_PAY, LIVING, PAUSABLE }

    /** DAILY: amount is per day. EVERY_N_MONTHS: due every intervalMonths counted from startDate. */
    public enum Frequency { MONTHLY, DAILY, EVERY_N_MONTHS }

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "commitment_group", nullable = false, length = 20)
    private Group group;

    private String category;

    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Frequency frequency = Frequency.MONTHLY;

    private Integer intervalMonths;

    private Integer dueDay;

    private LocalDate startDate;

    private LocalDate endDate;

    @Column(nullable = false)
    private boolean active = true;

    /** When set, the amount comes from the loan's EMI instead of {@link #amount}. */
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_loan_id")
    private Loan linkedLoan;

    /** When set, the amount comes from the chit's unpaid cycle for the month. */
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_chit_fund_id")
    private ChitFund linkedChitFund;

    @Column(length = 500)
    private String notes;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Group getGroup() { return group; }
    public void setGroup(Group group) { this.group = group; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public Frequency getFrequency() { return frequency; }
    public void setFrequency(Frequency frequency) { this.frequency = frequency; }
    public Integer getIntervalMonths() { return intervalMonths; }
    public void setIntervalMonths(Integer intervalMonths) { this.intervalMonths = intervalMonths; }
    public Integer getDueDay() { return dueDay; }
    public void setDueDay(Integer dueDay) { this.dueDay = dueDay; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Loan getLinkedLoan() { return linkedLoan; }
    public void setLinkedLoan(Loan linkedLoan) { this.linkedLoan = linkedLoan; }
    public ChitFund getLinkedChitFund() { return linkedChitFund; }
    public void setLinkedChitFund(ChitFund linkedChitFund) { this.linkedChitFund = linkedChitFund; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}

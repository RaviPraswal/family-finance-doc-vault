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

    @Column(length = 20)
    private String type = "DEBIT";

    @Column(length = 50)
    private String madeAgainst = "MANUAL_ENTRY";

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_bank_account_id")
    private BankAccount linkedAccount;

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_loan_id")
    private com.finnest.portfolio.Loan linkedLoan;

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_chit_fund_id")
    private com.finnest.portfolio.ChitFund linkedChitFund;

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_peer_lending_id")
    private com.finnest.portfolio.PeerLending linkedPeerLending;

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_investment_id")
    private com.finnest.portfolio.Investment linkedInvestment;

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_deposit_id")
    private com.finnest.portfolio.Deposit linkedDeposit;

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_project_id")
    private com.finnest.portfolio.Project linkedProject;

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_income_source_id")
    private com.finnest.portfolio.IncomeSource linkedIncomeSource;

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_credit_card_id")
    private com.finnest.portfolio.CreditCard linkedCreditCard;

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

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getMadeAgainst() {
        return madeAgainst;
    }

    public void setMadeAgainst(String madeAgainst) {
        this.madeAgainst = madeAgainst;
    }

    public com.finnest.portfolio.Loan getLinkedLoan() {
        return linkedLoan;
    }

    public void setLinkedLoan(com.finnest.portfolio.Loan linkedLoan) {
        this.linkedLoan = linkedLoan;
    }

    public com.finnest.portfolio.ChitFund getLinkedChitFund() {
        return linkedChitFund;
    }

    public void setLinkedChitFund(com.finnest.portfolio.ChitFund linkedChitFund) {
        this.linkedChitFund = linkedChitFund;
    }

    public com.finnest.portfolio.PeerLending getLinkedPeerLending() {
        return linkedPeerLending;
    }

    public void setLinkedPeerLending(com.finnest.portfolio.PeerLending linkedPeerLending) {
        this.linkedPeerLending = linkedPeerLending;
    }

    public com.finnest.portfolio.Investment getLinkedInvestment() {
        return linkedInvestment;
    }

    public void setLinkedInvestment(com.finnest.portfolio.Investment linkedInvestment) {
        this.linkedInvestment = linkedInvestment;
    }

    public com.finnest.portfolio.Deposit getLinkedDeposit() {
        return linkedDeposit;
    }

    public void setLinkedDeposit(com.finnest.portfolio.Deposit linkedDeposit) {
        this.linkedDeposit = linkedDeposit;
    }

    public com.finnest.portfolio.Project getLinkedProject() {
        return linkedProject;
    }

    public void setLinkedProject(com.finnest.portfolio.Project linkedProject) {
        this.linkedProject = linkedProject;
    }

    public com.finnest.portfolio.IncomeSource getLinkedIncomeSource() {
        return linkedIncomeSource;
    }

    public void setLinkedIncomeSource(com.finnest.portfolio.IncomeSource linkedIncomeSource) {
        this.linkedIncomeSource = linkedIncomeSource;
    }

    public com.finnest.portfolio.CreditCard getLinkedCreditCard() {
        return linkedCreditCard;
    }

    public void setLinkedCreditCard(com.finnest.portfolio.CreditCard linkedCreditCard) {
        this.linkedCreditCard = linkedCreditCard;
    }
}

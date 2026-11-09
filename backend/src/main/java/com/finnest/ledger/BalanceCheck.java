package com.finnest.ledger;

import com.finnest.common.TenantBaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Sprint 8 · S8-1: one daily bank balance check (what the bank showed vs. the ledger). */
@Entity
@Table(name = "bank_balance_checks")
public class BalanceCheck extends TenantBaseEntity {
    @Column(name = "bank_account_id", nullable = false)
    private UUID bankAccountId;
    @Column(name = "check_date", nullable = false)
    private LocalDate checkDate;
    @Column(name = "actual_balance", nullable = false)
    private BigDecimal actualBalance;
    @Column(name = "ledger_balance", nullable = false)
    private BigDecimal ledgerBalance;
    @Column(nullable = false)
    private BigDecimal difference;
    @Column(name = "adjustment_expense_id")
    private UUID adjustmentId;

    public UUID getBankAccountId() { return bankAccountId; }
    public void setBankAccountId(UUID v) { bankAccountId = v; }
    public LocalDate getCheckDate() { return checkDate; }
    public void setCheckDate(LocalDate v) { checkDate = v; }
    public BigDecimal getActualBalance() { return actualBalance; }
    public void setActualBalance(BigDecimal v) { actualBalance = v; }
    public BigDecimal getLedgerBalance() { return ledgerBalance; }
    public void setLedgerBalance(BigDecimal v) { ledgerBalance = v; }
    public BigDecimal getDifference() { return difference; }
    public void setDifference(BigDecimal v) { difference = v; }
    public UUID getAdjustmentId() { return adjustmentId; }
    public void setAdjustmentId(UUID v) { adjustmentId = v; }
}

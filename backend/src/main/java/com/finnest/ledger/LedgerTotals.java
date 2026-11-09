package com.finnest.ledger;

import com.finnest.expense.ExpenseRepository;
import com.finnest.portfolio.BankAccount;
import com.finnest.portfolio.Deposit;
import com.finnest.portfolio.Loan;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Sprint 7 (ADR-001 / D-03): every money total is "starting point + ledger". This is the only place totals are
 * computed, and {@link #refresh} the only place stored totals are written, so they can never drift from the ledger.
 */
@Service
public class LedgerTotals {
    private final ExpenseRepository expenses;

    public LedgerTotals(ExpenseRepository expenses) {
        this.expenses = expenses;
    }

    /** Opening balance + credits − debits. */
    public BigDecimal bankBalance(BankAccount a) {
        BigDecimal opening = a.getOpeningBalance() == null ? BigDecimal.ZERO : a.getOpeningBalance();
        return opening.add(expenses.netForAccount(a.getTenantId(), a.getId()));
    }

    /** Opening outstanding − principal repaid (+ amounts added); null when the loan never had an outstanding. */
    public BigDecimal loanOutstanding(Loan l) {
        return loanOutstandingExcluding(l, null);
    }

    /** As {@link #loanOutstanding}, ignoring one ledger entry (the EMI being posted or edited). */
    public BigDecimal loanOutstandingExcluding(Loan l, UUID excludeEntryId) {
        if (l.getOpeningOutstanding() == null) return null;
        BigDecimal repaid = excludeEntryId == null
                ? expenses.principalRepaidForLoan(l.getTenantId(), l.getId())
                : expenses.principalRepaidForLoanExcluding(l.getTenantId(), l.getId(), excludeEntryId);
        return l.getOpeningOutstanding().subtract(repaid);
    }

    /** RD only: opening deposited + instalments − withdrawals; null for other deposit types. */
    public BigDecimal rdDeposited(Deposit d) {
        if (!"RD".equalsIgnoreCase(d.getType())) return null;
        BigDecimal opening = d.getOpeningDeposited() == null ? BigDecimal.ZERO : d.getOpeningDeposited();
        return opening.add(expenses.netDepositedForDeposit(d.getTenantId(), d.getId()));
    }

    /** Sprint 7 T10: balances of all of a family's accounts with one query. */
    public java.util.Map<UUID, BigDecimal> bankBalances(UUID tenantId, java.util.List<BankAccount> accounts) {
        java.util.Map<UUID, BigDecimal> net = new java.util.HashMap<>();
        for (Object[] row : expenses.netByAccount(tenantId)) net.put((UUID) row[0], (BigDecimal) row[1]);
        java.util.Map<UUID, BigDecimal> out = new java.util.HashMap<>();
        for (BankAccount a : accounts) {
            BigDecimal opening = a.getOpeningBalance() == null ? BigDecimal.ZERO : a.getOpeningBalance();
            out.put(a.getId(), opening.add(net.getOrDefault(a.getId(), BigDecimal.ZERO)));
        }
        return out;
    }

    public void refresh(BankAccount a) { a.setCurrentBalance(bankBalance(a)); }
    public void refresh(Loan l) { if (l.getOpeningOutstanding() != null) l.setOutstandingAmount(loanOutstanding(l)); }
    public void refresh(Deposit d) { if ("RD".equalsIgnoreCase(d.getType())) d.setTotalDeposited(rdDeposited(d)); }
}

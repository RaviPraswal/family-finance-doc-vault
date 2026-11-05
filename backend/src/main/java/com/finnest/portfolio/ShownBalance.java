package com.finnest.portfolio;

import com.finnest.expense.Expense;

import java.math.BigDecimal;
import java.util.List;

/** The balance the app shows for a bank account: opening balance plus credits minus debits of its ledger entries (ADR-001). */
public final class ShownBalance {

    private ShownBalance() {}

    public static BigDecimal of(BankAccount account, List<Expense> entries) {
        BigDecimal balance = account.getOpeningBalance() == null ? BigDecimal.ZERO : account.getOpeningBalance();
        for (Expense e : entries) {
            if (e.getAmount() == null) continue;
            balance = "CREDIT".equalsIgnoreCase(e.getType()) ? balance.add(e.getAmount()) : balance.subtract(e.getAmount());
        }
        return balance;
    }
}

package com.finnest.expense;

import java.util.Map;

/**
 * What a ledger row means economically. DEBIT/CREDIT only says which way cash moved;
 * the kind says whether it was spending, saving, debt service, lending or a transfer,
 * so savings rate and "spent this month" exclude SIPs, EMIs, udhaar and self-transfers.
 */
public enum EntryKind {
    INCOME, EXPENSE, INVESTMENT, LOAN_PAYMENT, LENDING, TRANSFER;

    private static final Map<String, EntryKind> BY_CATEGORY = Map.of(
            "investment", INVESTMENT,
            "chit fund installment", INVESTMENT,
            "chit", INVESTMENT,
            "daughter / ssy", INVESTMENT,
            "loan emi", LOAN_PAYMENT,
            "peer lending (udhaar)", LENDING,
            "self transfer", TRANSFER,
            "credit card bill", TRANSFER);

    public static EntryKind of(String madeAgainst, String type, String category, boolean hasBankAccount) {
        boolean credit = "CREDIT".equalsIgnoreCase(type);
        switch (madeAgainst == null ? "" : madeAgainst) {
            case "LOAN_EMI": return LOAN_PAYMENT;
            case "SIP_INVESTMENT", "RECURRING_DEPOSIT", "CHIT_INSTALLMENT": return INVESTMENT;
            case "PEER_LENDING": return LENDING;
            case "INCOME_SOURCE": return INCOME;
            // Paying the card bill from a bank account moves money; the spend was logged on the card.
            case "CREDIT_CARD": return hasBankAccount ? TRANSFER : EXPENSE;
            default:
        }
        EntryKind byCategory = category == null ? null : BY_CATEGORY.get(category.trim().toLowerCase());
        if (byCategory != null) return byCategory;
        return credit ? INCOME : EXPENSE;
    }
}

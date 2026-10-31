package com.finnest.expense;

import com.finnest.portfolio.*;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Links decide what a row is before category text does. */
class ExpenseKindTest {

    private static Expense row(String type, String category) {
        Expense e = new Expense();
        e.setType(type);
        e.setCategory(category);
        e.setLinkedAccount(new BankAccount());
        return e;
    }

    private static EntryKind kindOf(Expense e) {
        e.deriveKind();
        return e.getKind();
    }

    @Test
    void emiLinkedToLoanIsLoanPaymentWhateverTheCategory() {
        Expense e = row("DEBIT", "EMI");
        e.setLinkedLoan(new Loan());
        assertThat(kindOf(e)).isEqualTo(EntryKind.LOAN_PAYMENT);
    }

    @Test
    void chitInstallmentAndRdAreSavingNotSpending() {
        Expense chit = row("DEBIT", "Bills");
        chit.setLinkedChitFund(new ChitFund());
        Expense rd = row("DEBIT", "Bills");
        rd.setLinkedDeposit(new Deposit());
        assertThat(kindOf(chit)).isEqualTo(EntryKind.INVESTMENT);
        assertThat(kindOf(rd)).isEqualTo(EntryKind.INVESTMENT);
    }

    @Test
    void udhaarEitherWayIsLending() {
        Expense lent = row("DEBIT", "Others");
        lent.setLinkedPeerLending(new PeerLending());
        Expense back = row("CREDIT", "Others");
        back.setLinkedPeerLending(new PeerLending());
        assertThat(kindOf(lent)).isEqualTo(EntryKind.LENDING);
        assertThat(kindOf(back)).isEqualTo(EntryKind.LENDING);
    }

    @Test
    void cardBillPaidFromBankIsTransfer() {
        Expense e = row("DEBIT", "Credit Card Bill");
        e.setLinkedCreditCard(new CreditCard());
        assertThat(kindOf(e)).isEqualTo(EntryKind.TRANSFER);
    }

    @Test
    void unlinkedRowsStillUseCategoryRules() {
        assertThat(kindOf(row("DEBIT", "Groceries"))).isEqualTo(EntryKind.EXPENSE);
        assertThat(kindOf(row("DEBIT", "Self Transfer"))).isEqualTo(EntryKind.TRANSFER);
        assertThat(kindOf(row("CREDIT", "Salary"))).isEqualTo(EntryKind.INCOME);
    }
}

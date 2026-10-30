package com.finnest.commitment;

import com.finnest.commitment.Commitment.Frequency;
import com.finnest.commitment.Commitment.Group;
import com.finnest.expense.EntryKind;
import com.finnest.portfolio.ChitFund;
import com.finnest.portfolio.Loan;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CommitmentPlannerTest {

    private static final YearMonth OCT = YearMonth.of(2026, 10);

    private static Commitment c(String name, Group group, String amount, Frequency freq) {
        Commitment c = new Commitment();
        c.setName(name);
        c.setGroup(group);
        c.setAmount(new BigDecimal(amount));
        c.setFrequency(freq);
        return c;
    }

    @Test
    void dailyRateTimesDaysInMonth() {
        Commitment milk = c("Milk", Group.LIVING, "80", Frequency.DAILY);
        assertEquals(0, new BigDecimal("2480").compareTo(CommitmentPlanner.amountFor(milk, OCT, OCT)));
        assertEquals(0, new BigDecimal("2400").compareTo(CommitmentPlanner.amountFor(milk, YearMonth.of(2026, 11), OCT)));
    }

    @Test
    void pausedAndOutOfRangeCostNothing() {
        Commitment sip = c("Gullak", Group.PAUSABLE, "3000", Frequency.MONTHLY);
        sip.setActive(false);
        assertEquals(0, CommitmentPlanner.amountFor(sip, OCT, OCT).signum());

        Commitment ended = c("Old RD", Group.MUST_PAY, "5000", Frequency.MONTHLY);
        ended.setEndDate(LocalDate.of(2026, 9, 5));
        assertEquals(0, CommitmentPlanner.amountFor(ended, OCT, OCT).signum());
    }

    @Test
    void everyTwoMonthsFromStart() {
        Commitment power = c("Electricity", Group.LIVING, "4000", Frequency.EVERY_N_MONTHS);
        power.setIntervalMonths(2);
        power.setStartDate(LocalDate.of(2026, 9, 1));
        assertEquals(0, CommitmentPlanner.amountFor(power, OCT, OCT).signum());
        assertEquals(0, new BigDecimal("4000").compareTo(CommitmentPlanner.amountFor(power, YearMonth.of(2026, 11), OCT)));
    }

    @Test
    void chitUsesUnpaidCycleAndCarriesOverdueIntoCurrentMonth() {
        ChitFund chit = new ChitFund();
        chit.setPaymentSchedule("""
                [{"calendarMonth":"Sep","calendarYear":2026,"actualAmount":11450,"status":"Open / Pending"},
                 {"calendarMonth":"Oct","calendarYear":2026,"actualAmount":11650,"status":"Open / Pending"},
                 {"calendarMonth":"Nov","calendarYear":2026,"actualAmount":11850,"status":"Open / Pending"},
                 {"calendarMonth":"Aug","calendarYear":2026,"actualAmount":11250,"status":"Paid & Closed"}]""");
        Commitment line = c("Chit C", Group.MUST_PAY, "0", Frequency.MONTHLY);
        line.setLinkedChitFund(chit);
        // October (current): overdue Sep + Oct; November (future): only Nov.
        assertEquals(0, new BigDecimal("23100").compareTo(CommitmentPlanner.amountFor(line, OCT, OCT)));
        assertEquals(0, new BigDecimal("11850").compareTo(CommitmentPlanner.amountFor(line, YearMonth.of(2026, 11), OCT)));
    }

    @Test
    void loanEmiStopsWhenRepaid() {
        Loan loan = new Loan();
        loan.setEmiAmount(new BigDecimal("31863"));
        loan.setOutstandingAmount(new BigDecimal("1435005"));
        Commitment emi = c("IndusInd EMI", Group.MUST_PAY, "0", Frequency.MONTHLY);
        emi.setLinkedLoan(loan);
        assertEquals(0, new BigDecimal("31863").compareTo(CommitmentPlanner.amountFor(emi, OCT, OCT)));
        loan.setOutstandingAmount(BigDecimal.ZERO);
        assertEquals(0, CommitmentPlanner.amountFor(emi, OCT, OCT).signum());
    }

    @Test
    void planMatchesSpreadsheetSurplusFormulas() {
        var plan = CommitmentPlanner.plan(List.of(
                c("Salary", Group.INCOME, "117706", Frequency.MONTHLY),
                c("Must", Group.MUST_PAY, "82700.5", Frequency.MONTHLY),
                c("Living", Group.LIVING, "11830", Frequency.MONTHLY),
                c("SIPs", Group.PAUSABLE, "6820", Frequency.MONTHLY)), OCT, OCT);
        assertEquals(0, new BigDecimal("16355.5").compareTo(plan.plannedSurplus()));
        assertEquals(0, new BigDecimal("23175.5").compareTo(plan.safeSurplus()));
    }

    @Test
    void entryKindSeparatesSpendingFromSavingAndDebt() {
        assertEquals(EntryKind.LOAN_PAYMENT, EntryKind.of("LOAN_EMI", "DEBIT", "Others", true));
        assertEquals(EntryKind.INVESTMENT, EntryKind.of("BANK_STATEMENT", "DEBIT", "Investment", true));
        assertEquals(EntryKind.TRANSFER, EntryKind.of("CREDIT_CARD", "DEBIT", "Others", true));
        assertEquals(EntryKind.EXPENSE, EntryKind.of("CREDIT_CARD", "DEBIT", "Groceries", false));
        assertEquals(EntryKind.LENDING, EntryKind.of("MANUAL_ENTRY", "CREDIT", "Peer Lending (Udhaar)", false));
        assertEquals(EntryKind.INCOME, EntryKind.of("MANUAL_ENTRY", "CREDIT", "Salary", true));
        assertEquals(EntryKind.EXPENSE, EntryKind.of(null, "DEBIT", "Fuel / Petrol", true));
    }

    @Test
    void chitMonthNamesAreReadInAnyCase() {
        ChitFund chit = new ChitFund();
        chit.setPaymentSchedule("""
                [{"calendarMonth":"OCT","calendarYear":2026,"actualAmount":11650,"status":"Open / Pending"}]""");
        Commitment line = c("Chit C", Group.MUST_PAY, "0", Frequency.MONTHLY);
        line.setLinkedChitFund(chit);
        assertEquals(0, new BigDecimal("11650").compareTo(CommitmentPlanner.amountFor(line, OCT, OCT)));
    }

    @Test
    void unreadableChitScheduleFallsBackToMonthlyInstallment() {
        ChitFund chit = new ChitFund();
        chit.setMonthlyInstallment(new BigDecimal("10000"));
        chit.setPendingInstallments(5);
        chit.setPaymentSchedule("not json");
        Commitment line = c("Chit B", Group.MUST_PAY, "0", Frequency.MONTHLY);
        line.setLinkedChitFund(chit);
        assertEquals(0, new BigDecimal("10000").compareTo(CommitmentPlanner.amountFor(line, OCT, OCT)));
    }
}

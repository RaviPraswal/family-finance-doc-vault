package com.finnest.commitment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finnest.commitment.Commitment.Frequency;
import com.finnest.commitment.Commitment.Group;
import com.finnest.portfolio.ChitFund;
import com.finnest.portfolio.Loan;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/** Pure month-plan math over commitments; no repositories, so it is unit-testable. */
public final class CommitmentPlanner {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final DateTimeFormatter MONTH_ABBR = DateTimeFormatter.ofPattern("MMM", Locale.ENGLISH);
    private static final String CHIT_UNPAID = "Open / Pending";

    private CommitmentPlanner() {}

    public record Line(UUID id, String name, Group group, String category, BigDecimal amount,
                       Integer dueDay, boolean active, String source) {}

    public record MonthPlan(String month, BigDecimal income, BigDecimal mustPay, BigDecimal living,
                            BigDecimal pausable, BigDecimal totalOutflow,
                            /* income - every active outflow */ BigDecimal plannedSurplus,
                            /* income - must-pay - living, i.e. with pause-able SIPs stopped */ BigDecimal safeSurplus,
                            List<Line> lines) {}

    public static MonthPlan plan(List<Commitment> commitments, YearMonth month, YearMonth currentMonth) {
        Map<Group, BigDecimal> totals = new EnumMap<>(Group.class);
        for (Group g : Group.values()) totals.put(g, BigDecimal.ZERO);
        List<Line> lines = new ArrayList<>();
        for (Commitment c : commitments) {
            BigDecimal amt = amountFor(c, month, currentMonth);
            totals.merge(c.getGroup(), amt, BigDecimal::add);
            lines.add(new Line(c.getId(), c.getName(), c.getGroup(), c.getCategory(), amt,
                    c.getDueDay(), c.isActive(), source(c)));
        }
        BigDecimal income = totals.get(Group.INCOME);
        BigDecimal mustPay = totals.get(Group.MUST_PAY);
        BigDecimal living = totals.get(Group.LIVING);
        BigDecimal pausable = totals.get(Group.PAUSABLE);
        BigDecimal outflow = mustPay.add(living).add(pausable);
        return new MonthPlan(month.toString(), income, mustPay, living, pausable, outflow,
                income.subtract(outflow), income.subtract(mustPay).subtract(living), lines);
    }

    /** What this commitment costs (or brings in) in {@code month}; 0 when paused or not due. */
    public static BigDecimal amountFor(Commitment c, YearMonth month, YearMonth currentMonth) {
        if (!c.isActive()) return BigDecimal.ZERO;
        if (c.getStartDate() != null && YearMonth.from(c.getStartDate()).isAfter(month)) return BigDecimal.ZERO;
        if (c.getEndDate() != null && YearMonth.from(c.getEndDate()).isBefore(month)) return BigDecimal.ZERO;

        if (c.getLinkedChitFund() != null) return chitDue(c.getLinkedChitFund(), month, currentMonth);
        if (c.getLinkedLoan() != null) return loanEmi(c.getLinkedLoan());

        BigDecimal amount = c.getAmount() == null ? BigDecimal.ZERO : c.getAmount();
        return switch (c.getFrequency()) {
            case MONTHLY -> amount;
            case DAILY -> amount.multiply(BigDecimal.valueOf(month.lengthOfMonth()));
            case EVERY_N_MONTHS -> {
                long since = ChronoUnit.MONTHS.between(YearMonth.from(c.getStartDate()), month);
                yield since % c.getIntervalMonths() == 0 ? amount : BigDecimal.ZERO;
            }
        };
    }

    private static BigDecimal loanEmi(Loan loan) {
        boolean open = loan.getOutstandingAmount() == null || loan.getOutstandingAmount().signum() > 0;
        return open && loan.getEmiAmount() != null ? loan.getEmiAmount() : BigDecimal.ZERO;
    }

    /**
     * Unpaid cycle(s) of the chit for the month. For the current month, earlier unpaid
     * cycles are overdue and still have to be paid, so they are included.
     */
    static BigDecimal chitDue(ChitFund chit, YearMonth month, YearMonth currentMonth) {
        String schedule = chit.getPaymentSchedule();
        if (schedule == null || schedule.isBlank()) {
            boolean pending = chit.getPendingInstallments() == null || chit.getPendingInstallments() > 0;
            return pending && chit.getMonthlyInstallment() != null ? chit.getMonthlyInstallment() : BigDecimal.ZERO;
        }
        BigDecimal due = BigDecimal.ZERO;
        try {
            for (JsonNode row : JSON.readTree(schedule)) {
                if (!CHIT_UNPAID.equals(row.path("status").asText())) continue;
                YearMonth cycle = YearMonth.of(row.path("calendarYear").asInt(),
                        MONTH_ABBR.parse(row.path("calendarMonth").asText()).get(java.time.temporal.ChronoField.MONTH_OF_YEAR));
                boolean counts = cycle.equals(month) || (month.equals(currentMonth) && cycle.isBefore(month));
                if (counts) due = due.add(row.path("actualAmount").decimalValue());
            }
        } catch (Exception e) {
            throw new IllegalStateException("Unreadable payment schedule for chit " + chit.getId(), e);
        }
        return due;
    }

    private static String source(Commitment c) {
        if (c.getLinkedChitFund() != null) return "Chit: " + c.getLinkedChitFund().getOrganizerName();
        if (c.getLinkedLoan() != null) return "Loan: " + c.getLinkedLoan().getLenderName();
        return switch (c.getFrequency()) {
            case MONTHLY -> "Monthly";
            case DAILY -> "Daily rate x days in month";
            case EVERY_N_MONTHS -> "Every " + c.getIntervalMonths() + " months";
        };
    }
}

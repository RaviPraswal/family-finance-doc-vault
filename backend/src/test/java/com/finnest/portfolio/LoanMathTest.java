package com.finnest.portfolio;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/** Pure maths, no database: runs in milliseconds. */
class LoanMathTest {

    private static BigDecimal rs(String v) { return new BigDecimal(v); }

    @Test
    void emiForFifteenLakhAtTenAndHalfPercentOverFifteenYears() {
        assertThat(LoanMath.emi(rs("1500000"), 10.5, 180)).isEqualByComparingTo("16581");
    }

    @Test
    void firstEmiIsMostlyInterest() {
        LoanMath.Split s = LoanMath.split(rs("1500000"), 10.5, rs("16581"));
        assertThat(s.interest()).isEqualByComparingTo("13125.00");
        assertThat(s.principal()).isEqualByComparingTo("3456.00");
    }

    @Test
    void twelveEmisLeaveAboutFourteenPointFiveSixLakh() {
        BigDecimal owed = rs("1500000");
        for (int m = 0; m < 12; m++) {
            owed = owed.subtract(LoanMath.split(owed, 10.5, rs("16581")).principal());
        }
        // Full-EMI subtraction (the old bug) would show 13.01 lakh here.
        assertThat(owed).isBetween(rs("1456400"), rs("1456550"));
    }

    @Test
    void noRateMeansWholePaymentIsPrincipal() {
        LoanMath.Split s = LoanMath.split(rs("50000"), null, rs("5000"));
        assertThat(s.interest()).isEqualByComparingTo("0");
        assertThat(s.principal()).isEqualByComparingTo("5000");
    }

    @Test
    void finalPaymentNeverPushesBalanceBelowZero() {
        LoanMath.Split s = LoanMath.split(rs("1000"), 12.0, rs("16581"));
        assertThat(s.principal()).isEqualByComparingTo("1000.00");
        assertThat(s.interest()).isEqualByComparingTo("10.00");
    }

    @Test
    void paymentSmallerThanInterestReducesNothing() {
        LoanMath.Split s = LoanMath.split(rs("1500000"), 10.5, rs("5000"));
        assertThat(s.principal()).isEqualByComparingTo("0");
        assertThat(s.interest()).isEqualByComparingTo("5000");
    }

    @Test
    void dailyMethodChargesActualDaysOverThreeSixtyFive() {
        // 10,00,000 at 10% for 31 days = 8,493.15 interest
        LoanMath.Split s = LoanMath.splitDaily(rs("1000000"), 10.0, rs("25000"), 31);
        assertThat(s.interest()).isEqualByComparingTo("8493.15");
        assertThat(s.principal()).isEqualByComparingTo("16506.85");
        // A 28-day February costs less interest than a 31-day month
        assertThat(LoanMath.splitDaily(rs("1000000"), 10.0, rs("25000"), 28).interest()).isEqualByComparingTo("7671.23");
    }

    @Test
    void methodSwitchPicksTheRightFormula() {
        assertThat(LoanMath.split(LoanMath.MONTHLY, rs("1200000"), 10.0, rs("20000"), 31).interest()).isEqualByComparingTo("10000.00");
        assertThat(LoanMath.split(LoanMath.DAILY_365, rs("1200000"), 10.0, rs("20000"), 31).interest()).isEqualByComparingTo("10191.78");
    }

    @Test
    void rateStoredAsFractionIsReadAsPercent() {
        assertThat(LoanMath.normalizeRate(0.105)).isEqualTo(10.5);
        assertThat(LoanMath.normalizeRate(10.5)).isEqualTo(10.5);
        assertThat(LoanMath.split(rs("1500000"), 0.105, rs("16581")).interest()).isEqualByComparingTo("13125.00");
    }
}

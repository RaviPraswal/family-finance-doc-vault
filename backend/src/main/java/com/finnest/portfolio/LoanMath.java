package com.finnest.portfolio;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;

/**
 * Reducing-balance loan arithmetic used by Indian banks: each month's interest is
 * outstanding × (annual rate / 12); the rest of the payment reduces the principal.
 */
public final class LoanMath {

    private static final BigDecimal TWELVE_HUNDRED = new BigDecimal("1200");

    private LoanMath() {}

    /** Interest is charged per month at rate/12 (most banks). */
    public static final String MONTHLY = "MONTHLY";
    /** Interest is charged on the actual days since the last payment, over a 365-day year (e.g. IndusInd). */
    public static final String DAILY_365 = "DAILY_365";

    /** Accepts 9.99 or 0.0999 for 9.99% (spreadsheets often store rates as fractions). */
    public static double normalizeRate(Double annualRatePercent) {
        if (annualRatePercent == null || annualRatePercent <= 0) return 0;
        return annualRatePercent < 1 ? annualRatePercent * 100 : annualRatePercent;
    }

    /** How one payment divides between interest and principal. */
    public record Split(BigDecimal interest, BigDecimal principal) {}

    /**
     * Splits a payment against the current outstanding balance.
     * Interest is rounded to paise; principal is never negative and never more than what is owed.
     * With no interest rate recorded, the whole payment is treated as principal.
     */
    public static Split split(BigDecimal outstanding, Double annualRatePercent, BigDecimal payment) {
        BigDecimal owed = outstanding == null ? BigDecimal.ZERO : outstanding.max(BigDecimal.ZERO);
        BigDecimal rate = BigDecimal.valueOf(normalizeRate(annualRatePercent));
        return apply(owed, owed.multiply(rate).divide(TWELVE_HUNDRED, 2, RoundingMode.HALF_UP), payment);
    }

    /** Daily method: interest = outstanding × rate × days / 365. */
    public static Split splitDaily(BigDecimal outstanding, Double annualRatePercent, BigDecimal payment, long days) {
        BigDecimal owed = outstanding == null ? BigDecimal.ZERO : outstanding.max(BigDecimal.ZERO);
        BigDecimal rate = BigDecimal.valueOf(normalizeRate(annualRatePercent));
        BigDecimal interest = owed.multiply(rate).multiply(BigDecimal.valueOf(Math.max(0, days)))
                .divide(new BigDecimal("36500"), 2, RoundingMode.HALF_UP);
        return apply(owed, interest, payment);
    }

    /** Splits by the given method; "days" is only used by the daily method. */
    public static Split split(String method, BigDecimal outstanding, Double annualRatePercent, BigDecimal payment, long days) {
        return DAILY_365.equals(method)
                ? splitDaily(outstanding, annualRatePercent, payment, days)
                : split(outstanding, annualRatePercent, payment);
    }

    private static Split apply(BigDecimal owed, BigDecimal interest, BigDecimal payment) {
        BigDecimal paid = payment == null ? BigDecimal.ZERO : payment;
        BigDecimal principal = paid.subtract(interest).max(BigDecimal.ZERO).min(owed);
        BigDecimal interestPaid = paid.subtract(principal).min(interest).max(BigDecimal.ZERO);
        return new Split(interestPaid.setScale(2, RoundingMode.HALF_UP), principal.setScale(2, RoundingMode.HALF_UP));
    }

    /** Standard EMI: P × r × (1+r)^n / ((1+r)^n − 1), rounded to the rupee. */
    public static BigDecimal emi(BigDecimal principal, double annualRatePercent, int months) {
        if (months <= 0) throw new IllegalArgumentException("months must be positive");
        annualRatePercent = normalizeRate(annualRatePercent);
        if (annualRatePercent <= 0) return principal.divide(BigDecimal.valueOf(months), 0, RoundingMode.HALF_UP);
        MathContext mc = MathContext.DECIMAL64;
        BigDecimal r = BigDecimal.valueOf(annualRatePercent).divide(TWELVE_HUNDRED, mc);
        BigDecimal pow = BigDecimal.ONE.add(r).pow(months, mc);
        return principal.multiply(r, mc).multiply(pow, mc)
                .divide(pow.subtract(BigDecimal.ONE), 0, RoundingMode.HALF_UP);
    }
}

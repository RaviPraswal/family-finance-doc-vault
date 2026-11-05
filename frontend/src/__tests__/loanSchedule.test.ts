import { describe, it, expect } from 'vitest';
import { buildLoanSchedule, scheduleSummary } from '../lib/loanSchedule';

// Sprint 5 (S5-03): the full EMI schedule of a loan, with paid and remaining instalments.
describe('loan EMI schedule', () => {
  it('monthly method: interest is rate/12 on the opening balance, last EMI clears the loan', () => {
    const rows = buildLoanSchedule({ principal: 500000, ratePercent: 10, emi: 10624, tenureMonths: 60, firstEmiDate: '2026-01-05', method: 'MONTHLY' });
    expect(rows).toHaveLength(60);
    expect(rows[0]).toMatchObject({ no: 1, dueDate: '2026-01-05', opening: 500000, interest: 4167, principal: 6457, closing: 493543 });
    expect(rows[1].dueDate).toBe('2026-02-05');
    expect(rows[59].closing).toBe(0);
    expect(rows.reduce((s, r) => s + r.principal, 0)).toBe(500000);
  });

  it('daily method: interest uses the actual days, the first period counted from disbursement', () => {
    const rows = buildLoanSchedule({
      principal: 1000000, ratePercent: 9, emi: 20758, tenureMonths: 60, method: 'DAILY_365',
      disbursementDate: '2026-01-10', firstEmiDate: '2026-01-25',
    });
    // 15 days: 10,00,000 x 9% x 15 / 365 = 3,698.6
    expect(rows[0].interest).toBe(3699);
    expect(rows[0].principal).toBe(20758 - 3699);
    // 25 Jan → 25 Feb is 31 days on the new balance
    expect(rows[1].interest).toBe(Math.round(rows[1].opening * 0.09 * 31 / 365));
    // 25 Feb → 25 Mar is 28 days
    expect(rows[2].interest).toBe(Math.round(rows[2].opening * 0.09 * 28 / 365));
  });

  it('foreclosure: charge on the opening balance after the lock-in, amount to close = opening + charge', () => {
    const rows = buildLoanSchedule({ principal: 500000, ratePercent: 10, emi: 10624, tenureMonths: 60, firstEmiDate: '2026-01-05', method: 'MONTHLY', foreclosureRate: 4, foreclosureLockInMonths: 1 });
    expect(rows[0]).toMatchObject({ foreclosureEligible: false, foreclosureCharge: 0, amountToClose: 500000 });
    expect(rows[1]).toMatchObject({ foreclosureEligible: true, foreclosureCharge: Math.round(rows[1].opening * 0.04) });
    expect(rows[1].amountToClose).toBe(rows[1].opening + rows[1].foreclosureCharge);
  });

  it('marks instalments paid, overdue, due this month or upcoming', () => {
    const rows = buildLoanSchedule(
      { principal: 500000, ratePercent: 10, emi: 10624, tenureMonths: 60, firstEmiDate: '2026-06-05', method: 'MONTHLY', paidInstallmentsOpening: 3 },
      { paidMonths: ['2026-10'], today: '2026-11-03' },
    );
    expect(rows.slice(0, 6).map((r) => r.status)).toEqual(['PAID', 'PAID', 'PAID', 'OVERDUE', 'PAID', 'DUE']);
    expect(rows[6].status).toBe('UPCOMING');
  });

  it('sums up what is paid and what is left', () => {
    const rows = buildLoanSchedule(
      { principal: 500000, ratePercent: 10, emi: 10624, tenureMonths: 60, firstEmiDate: '2026-06-05', method: 'MONTHLY', paidInstallmentsOpening: 3 },
      { paidMonths: [], today: '2026-09-20' },
    );
    const s = scheduleSummary(rows);
    expect(s.paid).toBe(3);
    expect(s.remaining).toBe(57);
    expect(s.principalRepaid).toBe(rows[0].principal + rows[1].principal + rows[2].principal);
    expect(s.outstanding).toBe(rows[2].closing);
    expect(s.next?.no).toBe(4);
  });

  it('returns nothing when the loan has no schedule details yet', () => {
    expect(buildLoanSchedule({ principal: 0, ratePercent: 10, emi: 0, tenureMonths: 0, firstEmiDate: undefined, method: 'MONTHLY' })).toEqual([]);
  });
});

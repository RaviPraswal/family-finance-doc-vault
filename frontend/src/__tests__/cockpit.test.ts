import { describe, it, expect } from 'vitest';
import { averageOverThreeMonths, monthlyIncome, fixedOutflows, investmentBuckets } from '../lib/cockpit';

// Sprint 3, S3-14: cockpit numbers (BR-NW-05, 08, 09, 11).
describe('cockpit maths', () => {
  it('averages over 3 months even when only one month has data', () => {
    expect(averageOverThreeMonths(new Map([['2026-8', 30000]]))).toBe(10000);
  });

  it('counts a monthly side income once, and falls back to salary sources only', () => {
    const sources = [
      { sourceName: 'Salary', amount: 80000, frequency: 'Monthly' },
      { sourceName: 'Rent from flat', amount: 15000, frequency: 'Monthly' },
      { sourceName: 'Bonus', amount: 120000, frequency: 'Yearly' },
      { sourceName: 'Gift', amount: 5000, frequency: 'One-time' },
    ];
    expect(monthlyIncome(sources, 0)).toEqual({ salary: 80000, side: 25000 });
    expect(monthlyIncome(sources, 90000)).toEqual({ salary: 90000, side: 25000 });
  });

  it('leaves out closed loans and matured RDs from fixed outflows', () => {
    const today = new Date('2026-10-31');
    const out = fixedOutflows(
      [{ emiAmount: 16581, outstandingAmount: 1400000 }, { emiAmount: 5000, outstandingAmount: 0 }],
      [{ type: 'RD', monthlyDepositAmount: 2000, maturityDate: '2027-03-01' }, { type: 'RD', monthlyDepositAmount: 3000, maturityDate: '2026-01-01' }],
      [{ monthlyInstallment: 5000, pendingInstallments: 4 }, { monthlyInstallment: 7000, pendingInstallments: 0 }],
      today,
    );
    expect(out).toEqual({ emi: 16581, rd: 2000, chit: 5000 });
  });

  it('puts every investment in exactly one bucket', () => {
    const buckets = investmentBuckets([
      { type: 'Gold', name: 'Sovereign Bond', currentValue: 100 },
      { type: 'Mutual Fund', name: 'Nifty ETF', currentValue: 200 },
      { type: 'Mutual Fund', name: 'Gold FoF', currentValue: 300 },
      { type: 'Stock', name: 'Infosys', investedAmount: 400 },
      { type: 'PPF', name: 'PPF', currentValue: 500 },
    ]);
    expect(buckets).toEqual({ gold: 400, silver: 0, mf: 200, stocks: 400, other: 500 });
    const total = Object.values(buckets).reduce((a, b) => a + b, 0);
    expect(total).toBe(1500);
  });
});

/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { averageOverThreeMonths, fixedOutflows, investmentBuckets, monthlyIncome } from '../lib/cockpit';
import { chitPosition, netWorthOf, udhaarPosition } from '../lib/netWorth';

// Sprint 7 T6 (SPEC P0-2, D-04): cockpit and net-worth totals are exact to the paisa.
describe('cockpit totals in paise', () => {
  it('sums EMIs, RDs and chits exactly', () => {
    const out = fixedOutflows([{ outstandingAmount: 1, emiAmount: 0.1 }, { outstandingAmount: 1, emiAmount: 0.2 }], [], [], new Date('2026-11-09'));
    expect(out.emi).toBe(0.3);
  });
  it('a yearly source is a twelfth per month, rounded to the paisa', () => {
    expect(monthlyIncome([{ sourceName: 'Rent', amount: 100000, frequency: 'Yearly' }], 0).side).toBe(8333.33);
  });
  it('the three-month average is rounded to the paisa', () => {
    expect(averageOverThreeMonths(new Map([['2026-08', 1000.1], ['2026-09', 1000.2]]), 3)).toBe(666.77);
  });
  it('investment buckets add exactly', () => {
    expect(investmentBuckets([{ type: 'Gold', name: 'Gold A', currentValue: 0.1 }, { type: 'Gold', name: 'Gold B', currentValue: 0.2 }]).gold).toBe(0.3);
  });
});

describe('net worth in paise', () => {
  it('chit paid-in value is exact (13,912.10 × 3, not 41,736.299999…)', () => {
    expect(chitPosition({ durationMonths: 20, pendingInstallments: 17, monthlyInstallment: 13912.1 }).asset).toBe(41736.3);
  });
  it('udhaar and net worth add exactly', () => {
    expect(udhaarPosition([{ type: 'GIVEN', amount: 0.1 }, { type: 'GIVEN', amount: 0.2 }]).lent).toBe(0.3);
    const nw = netWorthOf({ bankBalance: 0.1, investmentsExChits: 0.2, chits: [], loanOutstanding: 0, cardOutstanding: 0, udhaar: [] });
    expect(nw.assets).toBe(0.3);
  });
  it('money libraries do their arithmetic through lib/money', () => {
    for (const f of ['cockpit.ts', 'netWorth.ts', 'loanSchedule.ts', 'chitSchedule.ts', 'ssySchedule.ts', 'depositAmount.ts']) {
      expect(readFileSync(resolve(__dirname, '../lib', f), 'utf8'), f).toMatch(/from '\.\/money'/);
    }
  });
});

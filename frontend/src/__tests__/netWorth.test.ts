import { describe, it, expect } from 'vitest';
import { chitPosition, udhaarPosition, netWorthOf, projectNetWorth } from '../lib/netWorth';

describe('chit valuation', () => {
  it('before the prize, paid installments are an asset', () => {
    expect(chitPosition({ durationMonths: 20, pendingInstallments: 11, monthlyInstallment: 10000 })).toEqual({ asset: 90000, liability: 0 });
  });
  it('after the prize, remaining installments are owed', () => {
    expect(chitPosition({ durationMonths: 20, pendingInstallments: 11, monthlyInstallment: 10000, isAllotted: true })).toEqual({ asset: 0, liability: 110000 });
  });
});

describe('udhaar', () => {
  it('lent is an asset, borrowed a liability, settled ignored', () => {
    expect(udhaarPosition([
      { type: 'GIVEN', amount: 20000 },
      { type: 'TAKEN', amount: 25000 },
      { type: 'GIVEN', amount: 5000, settled: true },
    ])).toEqual({ lent: 20000, borrowed: 25000 });
  });
});

describe('net worth', () => {
  it('counts card dues, udhaar and chit liabilities', () => {
    const r = netWorthOf({
      bankBalance: 300000,
      investmentsExChits: 1000000,
      chits: [{ durationMonths: 20, pendingInstallments: 11, monthlyInstallment: 10000, isAllotted: true }],
      loanOutstanding: 1450000,
      cardOutstanding: 18240,
      udhaar: [{ type: 'GIVEN', amount: 58000 }, { type: 'TAKEN', amount: 35000 }],
    });
    expect(r.assets).toBe(1358000);
    expect(r.liabilities).toBe(1450000 + 18240 + 110000 + 35000);
    expect(r.netWorth).toBe(1358000 - 1613240);
  });
  it('a card in credit does not add to assets', () => {
    expect(netWorthOf({ bankBalance: 0, investmentsExChits: 0, chits: [], loanOutstanding: 0, cardOutstanding: -500, udhaar: [] }).netWorth).toBe(0);
  });
});

describe('projection', () => {
  it('shows a decline when spending exceeds income', () => {
    expect(projectNetWorth(100000, -5000, 3)).toEqual({ projected: 85000, change: -15000 });
  });
});

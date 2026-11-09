import { describe, it, expect } from 'vitest';
import { toPaise, fromPaise, addP, mulRateP, mulRateRupeeP, roundRupeeP, formatINR } from '../lib/money';

// Sprint 7 T2 (SPEC P0-2, D-04): client money maths in integer paise, never floats.
describe('toPaise', () => {
  it('converts rupees to whole paise without float error', () => {
    expect(toPaise(0.1)).toBe(10);
    expect(toPaise('120000.01')).toBe(12000001);
    expect(toPaise(13912.5)).toBe(1391250);
  });
  it('rounds a third decimal half-up, away from zero', () => {
    expect(toPaise(1.005)).toBe(101);
    expect(toPaise(-2.505)).toBe(-251);
  });
  it('treats empty and invalid input as zero', () => {
    expect(toPaise(null)).toBe(0);
    expect(toPaise(undefined)).toBe(0);
    expect(toPaise('')).toBe(0);
    expect(toPaise('abc')).toBe(0);
  });
});

describe('arithmetic', () => {
  it('adds exactly: 0.10 + 0.20 = 0.30', () => {
    expect(addP(toPaise(0.1), toPaise(0.2))).toBe(30);
    expect(fromPaise(addP(toPaise(0.1), toPaise(0.2)))).toBe(0.3);
  });
  it('rejects non-integer paise so floats cannot sneak in', () => {
    expect(() => addP(10, 0.5)).toThrow(/whole paise/);
  });
  it('applies a percentage rate over a fraction of a year, rounded to the paisa', () => {
    // 15,00,000 at 9.99% for 14 days on a 365-day year = 5,747.67
    expect(mulRateP(toPaise(1500000), 9.99, 14, 365)).toBe(574767);
    // monthly: 1,00,000 at 12% / 12 = 1,000.00
    expect(mulRateP(toPaise(100000), 12, 1, 12)).toBe(100000);
  });
  it('rounds a rate straight to whole rupees once, never paise first (no double rounding)', () => {
    // 8,59,765 at 9.99% for 30 days = 7,059.495: banks show 7,059; rounding to 7,059.50 first would give 7,060
    expect(mulRateRupeeP(toPaise(859765), 9.99, 30, 365)).toBe(705900);
    expect(mulRateRupeeP(toPaise(6250), 8.2, 1, 1)).toBe(51300);
  });
  it('rounds to whole rupees half-up, like a bank statement', () => {
    expect(roundRupeeP(574767)).toBe(574800);
    expect(roundRupeeP(574750)).toBe(574800);
    expect(roundRupeeP(574749)).toBe(574700);
    expect(roundRupeeP(-150)).toBe(-200);
  });
});

describe('formatINR', () => {
  it('formats paise in Indian grouping, whole rupees by default', () => {
    expect(formatINR(144202200)).toBe('₹14,42,022');
    expect(formatINR(0)).toBe('₹0');
  });
  it('shows paise when asked, and the minus sign before the rupee symbol', () => {
    expect(formatINR(1391250, { decimals: 2 })).toBe('₹13,912.50');
    expect(formatINR(-18100001, { decimals: 2 })).toBe('-₹1,81,000.01');
  });
});

import { describe, it, expect } from 'vitest';
import { depositAmountText, depositInvestedP } from '../lib/depositAmount';

// Sprint 7 T5 (Ravi, 2026-11-09): an RD shows both its monthly instalment and the total deposited.
describe('deposit amount label', () => {
  it('RD: monthly instalment and total deposited', () => {
    expect(depositAmountText({ type: 'RD', monthlyDepositAmount: 5000, totalDeposited: 10000 })).toBe('₹5,000/month · ₹10,000 deposited');
  });
  it('RD without a monthly amount shows the total only', () => {
    expect(depositAmountText({ type: 'RD', totalDeposited: 10000 })).toBe('₹10,000 deposited');
  });
  it('FD shows its principal', () => {
    expect(depositAmountText({ type: 'FD', principalAmount: 100000 })).toBe('₹1,00,000');
  });
  it('invested amount in paise: RD total (or principal), FD principal', () => {
    expect(depositInvestedP({ type: 'RD', totalDeposited: 10000.5 })).toBe(1000050);
    expect(depositInvestedP({ type: 'RD', principalAmount: 2000 })).toBe(200000);
    expect(depositInvestedP({ type: 'FD', principalAmount: 100000 })).toBe(10000000);
  });
});

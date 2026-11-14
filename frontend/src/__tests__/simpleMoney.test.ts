import { describe, it, expect } from 'vitest';
import {
  MONEY_IN, MONEY_OUT, OWN, OWE, spendingGroupOf, incomeGroupOf, monthSummary, ownedBreakdown, owedBreakdown, investmentGroupOf,
} from '../lib/simpleMoney';

// Sprint 9 (Ravi, 2026-11-14 "go ahead"): four plain categories — Money In, Money Out, Savings & Investments, Debts.
describe('The four categories', () => {
  it('keeps each category small and every sub-category explained with examples', () => {
    expect(MONEY_IN.length).toBeLessThanOrEqual(7);
    expect(MONEY_OUT.length).toBeLessThanOrEqual(7);
    expect(OWN.length).toBeLessThanOrEqual(7);
    expect(OWE.length).toBeLessThanOrEqual(7);
    for (const g of [...MONEY_IN, ...MONEY_OUT, ...OWN, ...OWE]) {
      expect(g.examples.length).toBeGreaterThanOrEqual(2);
      expect(g.examples.length).toBeLessThanOrEqual(3);
    }
    const names = [...MONEY_IN, ...MONEY_OUT, ...OWN, ...OWE].map((g) => g.name);
    expect(new Set(names).size).toBe(names.length); // no sub-category in two places
  });
});

describe('Where an old spending category goes', () => {
  it.each([
    ['Rent', 'Home & bills'], ['Utilities', 'Home & bills'], ['Bills', 'Home & bills'], ['Electricity', 'Home & bills'],
    ['Food', 'Food & daily needs'], ['Groceries', 'Food & daily needs'], ['Daily Life', 'Food & daily needs'],
    ['Travel', 'Transport & travel'], ['Fuel', 'Transport & travel'],
    ['Medical', 'Health & insurance'], ['Insurance premium', 'Health & insurance'],
    ['Education', 'Education & children'], ['School fees', 'Education & children'],
    ['Entertainment', 'Shopping & fun'], ['Shopping', 'Shopping & fun'],
    ['Gifts', 'Family & giving'], ['Donation', 'Family & giving'], ['Money to parents', 'Family & giving'],
    ['Home & bills', 'Home & bills'], ['Food & daily needs', 'Food & daily needs'],
  ])('%s → %s', (old, group) => {
    expect(spendingGroupOf(old)).toBe(group);
  });

  it('leaves an unknown category as "not sorted yet" instead of guessing', () => {
    expect(spendingGroupOf('Misc')).toBeNull();
    expect(spendingGroupOf('')).toBeNull();
  });
});

describe('Where money in goes', () => {
  it('sorts salary, side income, interest and the rest', () => {
    expect(incomeGroupOf({ category: 'Salary' })).toBe('Salary');
    expect(incomeGroupOf({ category: 'Wages' })).toBe('Salary');
    expect(incomeGroupOf({ category: 'Tuition', madeAgainst: 'INCOME_SOURCE' })).toBe('Side income');
    expect(incomeGroupOf({ category: 'Side Income' })).toBe('Side income');
    expect(incomeGroupOf({ category: 'FD Interest' })).toBe('Interest & returns');
    expect(incomeGroupOf({ category: 'Dividend' })).toBe('Interest & returns');
    expect(incomeGroupOf({ category: 'Cashback' })).toBe('Gifts & other income');
  });
});

describe('A month in four lines', () => {
  const entries = [
    { type: 'CREDIT', kind: 'INCOME', category: 'Salary', amount: 50000, expenseDate: '2026-11-01' },
    { type: 'CREDIT', kind: 'INCOME', category: 'Tuition', madeAgainst: 'INCOME_SOURCE', amount: 3000, expenseDate: '2026-11-03' },
    { type: 'DEBIT', kind: 'EXPENSE', category: 'Rent', amount: 12000, expenseDate: '2026-11-02' },
    { type: 'DEBIT', kind: 'EXPENSE', category: 'Groceries', amount: 4000.5, expenseDate: '2026-11-05' },
    { type: 'DEBIT', kind: 'EXPENSE', category: 'Misc', amount: 300, expenseDate: '2026-11-06' },
    { type: 'CREDIT', kind: 'INCOME', category: 'Refund', amount: 500, expenseDate: '2026-11-07' },
    { type: 'DEBIT', kind: 'LOAN_PAYMENT', category: 'Loan EMI', amount: 31863, loanPrincipalPortion: 19000, loanInterestPortion: 12863, expenseDate: '2026-11-05' },
    { type: 'DEBIT', kind: 'INVESTMENT', category: 'Investment', amount: 5000, expenseDate: '2026-11-10' },
    { type: 'DEBIT', kind: 'TRANSFER', category: 'Credit Card Bill', amount: 2000, expenseDate: '2026-11-12' },
    { type: 'DEBIT', kind: 'TRANSFER', category: 'Self Transfer', amount: 1000, expenseDate: '2026-11-12' },
    { type: 'CREDIT', kind: 'TRANSFER', category: 'Self Transfer', amount: 1000, expenseDate: '2026-11-12' },
    { type: 'DEBIT', kind: 'EXPENSE', category: 'Rent', amount: 12000, expenseDate: '2026-10-02' }, // last month
  ];
  const m = monthSummary(entries, '2026-11');

  it('money in is what you earned, by group', () => {
    expect(m.moneyIn.total).toBe(53000);
    expect(m.moneyIn.groups['Salary']).toBe(50000);
    expect(m.moneyIn.groups['Side income']).toBe(3000);
  });

  it('money out is real spending only — a refund lowers it, investing and moving money do not count', () => {
    expect(m.moneyOut.groups['Home & bills']).toBe(12000);
    expect(m.moneyOut.groups['Food & daily needs']).toBe(4000.5);
    expect(m.moneyOut.unsorted).toBe(300);
    expect(m.moneyOut.refunds).toBe(500);
    expect(m.moneyOut.total).toBe(15800.5); // 12000 + 4000.50 + 300 − 500
    expect(m.unsortedCount).toBe(1);
  });

  it('EMI: interest is a cost of the debt, the rest pays the loan down; SIPs and card bills are moves', () => {
    expect(m.loanInterest).toBe(12863);
    expect(m.movedToSavingsAndDebts).toBe(19000 + 5000 + 2000); // the self transfer between own accounts is neither
  });

  it('what is left = in − out − interest', () => {
    expect(m.left).toBe(53000 - 15800.5 - 12863);
  });
});

describe('What you own and owe', () => {
  it('splits investments into the plain groups', () => {
    expect(investmentGroupOf({ type: 'Mutual Fund', name: 'Index fund' })).toBe('Market investments');
    expect(investmentGroupOf({ type: 'Stock / Equity' })).toBe('Market investments');
    expect(investmentGroupOf({ type: 'PPF' })).toBe('Long-term schemes');
    expect(investmentGroupOf({ type: 'Other', name: 'Sukanya Samriddhi' })).toBe('Long-term schemes');
    expect(investmentGroupOf({ type: 'Gold' })).toBe('Gold & property');
    expect(investmentGroupOf({ type: 'Real Estate', name: 'Plot' })).toBe('Gold & property');
    expect(investmentGroupOf({ type: 'Fixed Deposit' })).toBe('Fixed savings');
  });

  it('adds up what you own, each item once', () => {
    const own = ownedBreakdown({
      accounts: [{ currentBalance: 10000 }, { currentBalance: 2500.25 }],
      deposits: [{ type: 'FD', principalAmount: 100000 }, { type: 'RD', principalAmount: 5000, totalDeposited: 65000 }],
      investments: [{ type: 'Mutual Fund', currentValue: 11000, investedAmount: 10000 }, { type: 'PPF', investedAmount: 50000 }, { type: 'Gold', currentValue: 7000 }],
      chits: [{ durationMonths: 20, pendingInstallments: 15, monthlyInstallment: 1000, isAllotted: false }],
      udhaar: [{ type: 'GIVEN', amount: 4000 }, { type: 'TAKEN', amount: 3000 }, { type: 'GIVEN', amount: 900, settled: true }],
    });
    expect(own.groups['Bank & cash']).toBe(12500.25);
    expect(own.groups['Fixed savings']).toBe(165000);
    expect(own.groups['Market investments']).toBe(11000);
    expect(own.groups['Long-term schemes']).toBe(50000);
    expect(own.groups['Gold & property']).toBe(7000);
    expect(own.groups['Chit funds']).toBe(5000);
    expect(own.groups['Money others owe you']).toBe(4000);
    expect(own.total).toBe(12500.25 + 165000 + 11000 + 50000 + 7000 + 5000 + 4000);
  });

  it('adds up what you owe, each item once', () => {
    const owe = owedBreakdown({
      loans: [{ loanType: 'Home Loan', outstandingAmount: 2000000 }, { loanType: 'Car Loan', outstandingAmount: 300000 },
        { loanType: 'Personal Loan', outstandingAmount: 1414925 }],
      cards: [{ currentOutstanding: 8000 }, { currentOutstanding: -200 }],
      chits: [{ durationMonths: 20, pendingInstallments: 5, monthlyInstallment: 1000, isAllotted: true }],
      udhaar: [{ type: 'TAKEN', amount: 3000 }],
    });
    expect(owe.groups['Home & vehicle loans']).toBe(2300000);
    expect(owe.groups['Personal & education loans']).toBe(1414925);
    expect(owe.groups['Chit instalments still to pay']).toBe(5000); // after you took the payout
    expect(owe.groups['Credit cards']).toBe(8000);
    expect(owe.groups['Money you borrowed from people']).toBe(3000);
    expect(owe.total).toBe(2300000 + 1414925 + 5000 + 8000 + 3000);
  });
});

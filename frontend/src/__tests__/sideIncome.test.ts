import { describe, it, expect } from 'vitest';
import { sideIncomeRows } from '../lib/sideIncome';

// Sprint 8 S8-6: one row per side-income source — last entry, next due, and honest overdue wording.
const credit = (id: string, date: string, amount: number) => ({ type: 'CREDIT', amount, expenseDate: date, linkedIncomeSource: { id } });

describe('side income rows', () => {
  const today = '2026-11-09';
  const sources = [
    { id: 'd', sourceName: 'Dinesh', amount: 30000, frequency: 'Monthly' },
    { id: 'l', sourceName: 'Lokesh', amount: 13000, frequency: 'Monthly' },
    { id: 'n', sourceName: 'New', amount: 5000, frequency: 'Monthly' },
  ];
  const entries = [credit('d', '2026-07-09', 15000), credit('d', '2026-06-09', 14000), credit('l', '2026-11-02', 13000)];
  const rows = sideIncomeRows(sources, entries, today);

  it('shows the last entry and expects the amount actually received', () => {
    expect(rows[0]).toMatchObject({ name: 'Dinesh', lastDate: '2026-07-09', lastAmount: 15000, expected: 15000, history: [{ date: '2026-07-09' }, { date: '2026-06-09' }] });
  });

  it('a missed month reads as overdue, never as negative days left', () => {
    expect(rows[0]).toMatchObject({ status: 'OVERDUE', nextDue: '2026-08-09', label: 'Overdue by 92 days', missed: 4 });
  });

  it('received this month: next due is next month', () => {
    expect(rows[1]).toMatchObject({ status: 'RECEIVED', nextDue: '2026-12-02', label: 'Received this month · next 2 Dec' });
  });

  it('a source with no payment yet says so', () => {
    expect(rows[2]).toMatchObject({ status: 'NONE', lastDate: null, nextDue: null, label: 'No payment yet', expected: 5000 });
  });

  it('a payment due within a week is due soon', () => {
    const r = sideIncomeRows([sources[1]], [credit('l', '2026-10-12', 13000)], today)[0];
    expect(r).toMatchObject({ status: 'DUE', nextDue: '2026-11-12', label: 'Due in 3 days' });
  });
});

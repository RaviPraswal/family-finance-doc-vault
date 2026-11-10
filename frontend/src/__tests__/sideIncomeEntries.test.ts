import { describe, it, expect } from 'vitest';
import { sideIncomeRows, sideIncomeEntries, sideIncomeTotals } from '../lib/sideIncome';

// Sprint 8 fix: every payment received shows up, wherever it was recorded; quarterly/half-yearly sources work.
const e = (id: string, date: string, amount: number, extra: Record<string, unknown> = {}) =>
  ({ id, type: 'CREDIT', amount, expenseDate: date, category: 'Side Income', ...extra });

describe('side income entries', () => {
  it('includes credits linked to a source or recorded as side income, newest first; never debits', () => {
    const list = sideIncomeEntries([
      e('1', '2026-10-01', 100, { linkedIncomeSource: { id: 's' }, madeAgainst: 'MANUAL_ENTRY', category: 'Rent' }),
      e('2', '2026-11-01', 200, { madeAgainst: 'INCOME_SOURCE' }),
      e('3', '2026-09-01', 300, { category: 'side income' }),
      e('4', '2026-11-02', 400, { category: 'Salary' }),
      e('5', '2026-11-03', 500, { type: 'DEBIT', linkedIncomeSource: { id: 's' } }),
    ]);
    expect(list.map((x) => x.id)).toEqual(['2', '1', '3']);
  });

  it('totals this month and this financial year (April–March), exactly', () => {
    const list = [e('a', '2026-11-02', 15000.5), e('b', '2026-04-01', 1000), e('c', '2026-03-31', 999), e('d', '2026-11-09', 0.25)];
    expect(sideIncomeTotals(list, '2026-11-09')).toEqual({ thisMonth: 15000.75, thisYear: 16000.75 });
  });

  it('history rows carry the bank and note', () => {
    const rows = sideIncomeRows([{ id: 's', sourceName: 'Tuition', amount: 5000, frequency: 'Monthly' }],
      [e('1', '2026-11-02', 5000, { linkedIncomeSource: { id: 's' }, linkedAccount: { id: 'a', bankName: 'SBI' }, description: 'Nov fee' })], '2026-11-09');
    expect(rows[0].history[0]).toMatchObject({ id: '1', date: '2026-11-02', amount: 5000, bank: 'SBI', note: 'Nov fee' });
  });

  it('a quarterly source is due three months after the last payment', () => {
    const r = sideIncomeRows([{ id: 's', sourceName: 'Rent', amount: 9000, frequency: 'Quarterly' }],
      [e('1', '2026-09-05', 9000, { linkedIncomeSource: { id: 's' } })], '2026-11-09')[0];
    expect(r).toMatchObject({ status: 'RECEIVED', nextDue: '2026-12-05', label: 'Received this quarter · next 5 Dec' });
    const late = sideIncomeRows([{ id: 's', sourceName: 'Rent', amount: 9000, frequency: 'Half-yearly' }],
      [e('1', '2026-04-05', 9000, { linkedIncomeSource: { id: 's' } })], '2026-11-09')[0];
    expect(late).toMatchObject({ status: 'OVERDUE', nextDue: '2026-10-05' });
  });
});

import { describe, it, expect } from 'vitest';
import { ssyEntries, linkCandidates, linkPayload } from '../lib/ssyEntries';

// Sprint 8 · S8-3: every entry made into Tejal's Sukanya account, with a running total.
const inv = { id: 'ssy1', name: 'Tejal Sukanya' };
const e = (id: string, date: string, amount: number, extra: Record<string, unknown> = {}) =>
  ({ id, expenseDate: date, amount, type: 'DEBIT', category: 'Investment', description: '', ...extra });

describe('ssyEntries', () => {
  it('lists linked entries oldest first with an exact running total', () => {
    const r = ssyEntries([
      e('b', '2026-08-02', 50000.1, { linkedInvestment: { id: 'ssy1' } }),
      e('a', '2026-05-02', 100000.2, { linkedInvestment: { id: 'ssy1' } }),
      e('x', '2026-06-01', 999, { linkedInvestment: { id: 'other' } }),
    ], 'ssy1');
    expect(r.rows.map((x) => x.id)).toEqual(['a', 'b']);
    expect(r.rows.map((x) => x.runningTotal)).toEqual([100000.2, 150000.3]);
    expect(r.total).toBe(150000.3);
  });
  it('a withdrawal (credit) reduces the total', () => {
    const r = ssyEntries([
      e('a', '2026-05-02', 1000, { linkedInvestment: { id: 'ssy1' } }),
      e('b', '2026-06-02', 400, { type: 'CREDIT', linkedInvestment: { id: 'ssy1' } }),
    ], 'ssy1');
    expect(r.rows[1].signedAmount).toBe(-400);
    expect(r.total).toBe(600);
  });
  it('is empty when nothing is linked', () => {
    expect(ssyEntries([], 'ssy1')).toEqual({ rows: [], total: 0 });
  });
});

describe('linkCandidates', () => {
  it('finds unlinked entries that mention Sukanya, SSY or the child name', () => {
    const c = linkCandidates([
      e('1', '2026-05-02', 1000, { description: 'Tejal investment' }),
      e('2', '2026-05-03', 1000, { description: 'SSY deposit' }),
      e('3', '2026-05-04', 1000, { category: 'Sukanya Samriddhi' }),
      e('4', '2026-05-05', 1000, { description: 'Tejal investment', linkedInvestment: { id: 'ssy1' } }),
      e('5', '2026-05-06', 1000, { description: 'groceries' }),
      e('6', '2026-05-07', 1000, { description: 'Tejal', linkedLoan: { id: 'l1' } }),
    ], inv);
    expect(c.map((x) => x.id)).toEqual(['3', '2', '1']);
  });
});

describe('linkPayload', () => {
  it('keeps every field and existing link, and adds the investment', () => {
    const p = linkPayload(e('1', '2026-05-02', 1000, { description: 'Tejal investment', madeAgainst: 'GENERAL', linkedAccount: { id: 'acc', name: 'SBI' } }), 'ssy1');
    expect(p).toMatchObject({
      amount: 1000, expenseDate: '2026-05-02', description: 'Tejal investment', type: 'DEBIT',
      madeAgainst: 'SIP_INVESTMENT', linkedAccount: { id: 'acc' }, linkedInvestment: { id: 'ssy1' },
    });
    expect(p.linkedLoan).toBeNull();
  });
});

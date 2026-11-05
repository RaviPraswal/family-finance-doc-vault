import { describe, it, expect } from 'vitest';
import { projectedSchedule } from '../lib/loanSchedule';
import { buildSsySchedule, ssySummary, isSukanya } from '../lib/ssySchedule';
import { withLedgerAmounts } from '../lib/cockpit';
import { layoutMoneyMap } from '../lib/moneyMap';

// Sprint 6 (S6-01): a loan without its statement details still gets a schedule, projected from today.
describe('projected EMI schedule', () => {
  const rows = projectedSchedule({ outstanding: 100000, ratePercent: 12, emi: 10000, emiDay: 5 }, { today: '2026-11-06' });

  it('starts at the next EMI date and runs until the balance is cleared', () => {
    expect(rows[0]).toMatchObject({ no: 1, dueDate: '2026-12-05', opening: 100000, interest: 1000, principal: 9000, closing: 91000, status: 'UPCOMING' });
    expect(rows).toHaveLength(11);
    expect(rows[rows.length - 1].closing).toBe(0);
  });

  it('marks this month\'s EMI as due when it has not passed yet', () => {
    expect(projectedSchedule({ outstanding: 100000, ratePercent: 12, emi: 10000, emiDay: 5 }, { today: '2026-11-03' })[0])
      .toMatchObject({ dueDate: '2026-11-05', status: 'DUE' });
  });

  it('returns nothing when the EMI cannot even cover the interest', () => {
    expect(projectedSchedule({ outstanding: 100000, ratePercent: 12, emi: 900 })).toEqual([]);
    expect(projectedSchedule({ outstanding: 0, ratePercent: 12, emi: 900 })).toEqual([]);
  });
});

// Sprint 6 (S6-04): Sukanya Samriddhi, year by year: 15 years of deposits, interest compounded yearly, maturity at 21 years.
describe('Sukanya Samriddhi schedule', () => {
  const rows = buildSsySchedule({ startDate: '2024-04-10', yearlyDeposit: 15000, ratePercent: 8.2, deposited: 30000 }, '2026-11-05');

  it('has 21 years, deposits only in the first 15', () => {
    expect(rows).toHaveLength(21);
    expect(rows[14].deposit).toBe(15000);
    expect(rows[15]).toMatchObject({ year: 16, deposit: 0, status: 'GROWING' });
  });

  it('compounds interest yearly on the balance including that year\'s deposit', () => {
    expect(rows[0]).toMatchObject({ year: 1, startDate: '2024-04-10', opening: 0, deposit: 15000, interest: 1230, closing: 16230 });
    expect(rows[1]).toMatchObject({ opening: 16230, interest: 2561, closing: 33791 });
  });

  it('marks deposits made, this year\'s deposit as due, and later ones as upcoming', () => {
    expect(rows.slice(0, 4).map((r) => r.status)).toEqual(['PAID', 'PAID', 'DUE', 'UPCOMING']);
  });

  it('summarises deposits and the maturity', () => {
    const s = ssySummary(rows);
    expect(s).toMatchObject({ paid: 2, remainingDeposits: 13, totalDeposits: 225000, maturityDate: '2045-04-10' });
    expect(s.maturityValue).toBe(rows[20].closing);
  });

  it('shows how much of a part-paid year is deposited so far', () => {
    const part = buildSsySchedule({ startDate: '2026-05-02', yearlyDeposit: 150000, ratePercent: 8.2, deposited: 35000 }, '2026-11-05');
    expect(part[0]).toMatchObject({ deposit: 150000, depositedSoFar: 35000, status: 'DUE' });
    expect(part[1].depositedSoFar).toBe(0);
    expect(rows[0].depositedSoFar).toBe(15000);
  });

  it('needs a start date and yearly deposit', () => {
    expect(buildSsySchedule({ startDate: null, yearlyDeposit: 15000, deposited: 0 })).toEqual([]);
  });

  it('recognises Sukanya investments by type or name', () => {
    expect(isSukanya({ type: 'Tejal Sukanya Yojna', name: 'x' })).toBe(true);
    expect(isSukanya({ type: 'Other', name: 'Daughter SSY' })).toBe(true);
    expect(isSukanya({ type: 'Mutual Fund', name: 'Flexi cap' })).toBe(false);
  });
});

// Sprint 6 (S6-03): side income shows what was actually received, not a stale expected figure.
describe('side income from the ledger', () => {
  it('uses the latest credit received for each source', () => {
    const sources = [{ id: 's1', sourceName: 'Dinesh', amount: 30000, frequency: 'Monthly' }, { id: 's2', sourceName: 'New', amount: 5000, frequency: 'Monthly' }];
    const entries = [
      { type: 'CREDIT', amount: 14000, expenseDate: '2026-06-09', linkedIncomeSource: { id: 's1' } },
      { type: 'CREDIT', amount: 15000, expenseDate: '2026-07-09', linkedIncomeSource: { id: 's1' } },
      { type: 'DEBIT', amount: 99999, expenseDate: '2026-08-01', linkedIncomeSource: { id: 's1' } },
    ];
    const out = withLedgerAmounts(sources, entries);
    expect(out.map((s) => s.amount)).toEqual([15000, 5000]);
  });
});

// Sprint 6 (S6-02): one member holding many things must not pile up on the money map.
describe('money map with many holdings', () => {
  const holdings = [
    ...Array.from({ length: 25 }, (_, i) => ({ id: 'i' + i, userId: 'u1', label: 'Fund ' + i, kind: 'investment' as const })),
    ...Array.from({ length: 4 }, (_, i) => ({ id: 'a' + i, userId: 'u1', label: 'Bank ' + i, kind: 'account' as const })),
    { id: 'l0', userId: 'u1', label: 'Home loan', kind: 'loan' as const },
  ];
  const map = layoutMoneyMap('Praswal Family', [{ id: 'u1', name: 'Ravi' }], holdings);

  it('groups the holdings by type with their count', () => {
    expect(map.nodes.find((n) => n.id === 'u1:investment')).toMatchObject({ code: '25', label: 'Investments' });
    expect(map.nodes.find((n) => n.id === 'u1:account')).toMatchObject({ code: '4', label: 'Accounts' });
    expect(map.nodes.find((n) => n.id === 'u1:loan')).toMatchObject({ code: '1', label: 'Loans' });
    expect(map.links).toContainEqual({ from: 'u1', to: 'u1:investment' });
    expect(map.nodes).toHaveLength(5); // family, member, 3 groups
  });

  it('keeps every node clear of the others', () => {
    for (const a of map.nodes) for (const b of map.nodes) {
      if (a === b) continue;
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(12);
    }
  });
});

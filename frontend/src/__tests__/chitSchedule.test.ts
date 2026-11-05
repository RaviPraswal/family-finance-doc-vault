import { describe, it, expect } from 'vitest';
import { chitRows, chitSummary, markPaidThrough } from '../lib/chitSchedule';

const row = (srNo: number, month: string, year: number, amount: number, status: string) =>
  ({ srNo, monthCycle: `Month ${srNo}`, calendarMonth: month, calendarYear: year, actualAmount: amount, chitAmountAllocated: 0, status });

// Sprint 5 (S5-04): every month of a chit, with what is paid and what is left.
describe('chit schedule', () => {
  const schedule = [
    row(1, 'Aug', 2026, 15000, 'Paid & Closed'),
    row(2, 'Sep', 2026, 11250, 'Allotted'),
    row(3, 'Oct', 2026, 11450, 'Open / Pending'),
    row(4, 'Nov', 2026, 11650, 'Open / Pending'),
    row(5, 'Dec', 2026, 11850, 'Open / Pending'),
  ];

  it('shows paid, allotted, overdue, due this month and upcoming, with a running total paid', () => {
    const rows = chitRows(schedule as never, new Date('2026-11-05'));
    expect(rows.map((r) => r.display)).toEqual(['PAID', 'ALLOTTED', 'OVERDUE', 'DUE', 'UPCOMING']);
    expect(rows.map((r) => r.depositedToDate)).toEqual([15000, 26250, 26250, 26250, 26250]);
  });

  it('sums paid and remaining instalments and amounts', () => {
    const s = chitSummary(chitRows(schedule as never, new Date('2026-11-05')));
    expect(s).toMatchObject({ paid: 2, remaining: 3, deposited: 26250, remainingAmount: 34950 });
    expect(s.next?.srNo).toBe(3);
  });

  it('marks every pending month up to the chosen one as paid, leaving allotted and later months alone', () => {
    const next = markPaidThrough(schedule as never, 4);
    expect(next.map((r) => r.status)).toEqual(['Paid & Closed', 'Allotted', 'Paid & Closed', 'Paid & Closed', 'Open / Pending']);
  });
});

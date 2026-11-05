/** Data for the dot-matrix mini charts on cockpit cards (Sprint 4). */

export const DOT_ROWS = 5;

/** Scales each value to a column height of 0..5 dots; the largest value (by size) fills its column. */
export function dotLevels(values: number[], rows: number = DOT_ROWS): number[] {
  const max = Math.max(0, ...values.map((v) => Math.abs(v)));
  if (max === 0) return values.map(() => 0);
  return values.map((v) => Math.round((Math.abs(v) / max) * rows));
}

export interface LedgerEntryLike {
  expenseDate?: string;
  type?: string;
  amount?: number;
  kind?: string;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Money in minus money out for each of the last {@code weeks} weeks, oldest first, ending on {@code today}.
 * Transfers between the family's own accounts are left out.
 */
export function weeklyNet(entries: LedgerEntryLike[], weeks: number, today: Date = new Date()): number[] {
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);
  const totals = new Array(weeks).fill(0);
  for (const e of entries) {
    if (!e.expenseDate || e.kind === 'TRANSFER') continue;
    const age = Math.floor((end.getTime() - new Date(e.expenseDate).getTime()) / (7 * DAY));
    if (age < 0 || age >= weeks) continue;
    const amount = e.amount || 0;
    totals[weeks - 1 - age] += e.type === 'CREDIT' ? amount : -amount;
  }
  return totals;
}

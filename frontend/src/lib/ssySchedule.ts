/**
 * Sprint 6 (S6-04): a Sukanya Samriddhi account year by year.
 * Deposits are made for the first 15 years; the account keeps earning until it matures 21 years after opening.
 * Interest is compounded yearly on the balance including that year's deposit (deposit made early in the year),
 * at the rate the government sets each quarter (8.2% since 2024).
 */

export type SsyStatus = 'PAID' | 'OVERDUE' | 'DUE' | 'UPCOMING' | 'GROWING';

export interface SsyTerms {
  startDate?: string | null;
  yearlyDeposit?: number | null;
  ratePercent?: number | null;
  /** Total deposited so far; whole yearly deposits count as paid years. */
  deposited?: number | null;
}

export interface SsyRow {
  year: number;
  startDate: string;
  opening: number;
  deposit: number;
  /** How much of this year's deposit has been made so far (deposits fill the years in order). */
  depositedSoFar: number;
  interest: number;
  closing: number;
  status: SsyStatus;
}

export const SSY_RATE = 8.2;
const DEPOSIT_YEARS = 15;
const TERM_YEARS = 21;

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const addYears = (d: Date, k: number) => new Date(d.getFullYear() + k, d.getMonth(), d.getDate());

export function isSukanya(inv: { type?: string | null; name?: string | null }): boolean {
  return /sukanya|\bssy\b/i.test(`${inv.type ?? ''} ${inv.name ?? ''}`);
}

export function buildSsySchedule(terms: SsyTerms, today: string | Date = new Date()): SsyRow[] {
  const yearly = terms.yearlyDeposit ?? 0;
  if (!terms.startDate || yearly <= 0) return [];
  const start = parse(terms.startDate);
  const now = typeof today === 'string' ? parse(today) : new Date(today);
  now.setHours(0, 0, 0, 0);
  const rate = (terms.ratePercent || SSY_RATE) / 100;
  const paidYears = Math.min(DEPOSIT_YEARS, Math.floor((terms.deposited ?? 0) / yearly));

  const rows: SsyRow[] = [];
  let balance = 0;
  let unallocated = terms.deposited ?? 0;
  for (let year = 1; year <= TERM_YEARS; year++) {
    const from = addYears(start, year - 1);
    const to = addYears(start, year);
    const deposit = year <= DEPOSIT_YEARS ? yearly : 0;
    const depositedSoFar = Math.min(deposit, Math.max(0, unallocated));
    unallocated -= depositedSoFar;
    const interest = Math.round((balance + deposit) * rate);
    const status: SsyStatus = year > DEPOSIT_YEARS ? 'GROWING'
      : year <= paidYears ? 'PAID'
      : to <= now ? 'OVERDUE'
      : from <= now ? 'DUE' : 'UPCOMING';
    rows.push({ year, startDate: iso(from), opening: balance, deposit, depositedSoFar, interest, closing: balance + deposit + interest, status });
    balance += deposit + interest;
  }
  return rows;
}

export function ssySummary(rows: SsyRow[]) {
  const depositRows = rows.filter((r) => r.deposit > 0);
  const paid = depositRows.filter((r) => r.status === 'PAID').length;
  const last = rows[rows.length - 1];
  const start = rows[0] ? parse(rows[0].startDate) : null;
  return {
    paid,
    remainingDeposits: depositRows.length - paid,
    overdue: rows.filter((r) => r.status === 'OVERDUE').length,
    totalDeposits: depositRows.reduce((s, r) => s + r.deposit, 0),
    maturityValue: last?.closing ?? 0,
    maturityDate: start ? iso(addYears(start, TERM_YEARS)) : '',
    next: rows.find((r) => r.status === 'DUE' || r.status === 'OVERDUE' || r.status === 'UPCOMING'),
  };
}

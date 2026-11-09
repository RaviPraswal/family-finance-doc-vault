import { divRupees, sumRupees } from './money';
/**
 * Money-cockpit maths, kept out of the page so it can be tested (Sprint 3, S3-14).
 * Amounts are rupees per month unless stated.
 */

/**
 * Average over the last 3 full months, but only over the months the family has been tracking
 * (a family that started last month has one month of history, not three). A month with no entries counts as zero.
 */
export function averageOverThreeMonths(byMonth: Map<string, number>, months: number = 3): number {
  return divRupees(sumRupees(Array.from(byMonth.values())), Math.min(3, Math.max(1, months)));
}

/** Full months of history before the current month, from the first ledger entry (1 to 3). */
export function monthsTracked(firstEntryDate: string | undefined, today: Date = new Date()): number {
  if (!firstEntryDate) return 3;
  const [y, m] = firstEntryDate.slice(0, 7).split('-').map(Number);
  const months = today.getFullYear() * 12 + today.getMonth() - (y * 12 + (m - 1));
  return Math.min(3, Math.max(1, months));
}

export interface IncomeSourceLike {
  sourceName?: string;
  amount?: number;
  frequency?: string;
}

const isSalary = (s: IncomeSourceLike) => (s.sourceName || '').toLowerCase().includes('salary');

function perMonth(s: IncomeSourceLike): number {
  const amount = s.amount || 0;
  if (s.frequency === 'Yearly') return divRupees(amount, 12);
  if (s.frequency === 'One-time') return 0;
  return amount; // Monthly or unspecified
}

/**
 * Salary comes from the ledger average; when the ledger has none, from income sources named "salary".
 * Side income is every other source, each counted once.
 */
export function monthlyIncome(sources: IncomeSourceLike[], ledgerSalary: number): { salary: number; side: number } {
  const salary = ledgerSalary > 0
    ? ledgerSalary
    : sumRupees(sources.filter(isSalary).map(perMonth));
  const side = sumRupees(sources.filter(s => !isSalary(s)).map(perMonth));
  return { salary, side };
}

export interface LoanLike { emiAmount?: number; outstandingAmount?: number }
export interface DepositLike { type?: string; monthlyDepositAmount?: number; maturityDate?: string }
export interface ChitInstallmentLike { monthlyInstallment?: number; pendingInstallments?: number }

/** Monthly EMIs, RD deposits and chit installments still running on {@code today}. */
export function fixedOutflows(loans: LoanLike[], deposits: DepositLike[], chits: ChitInstallmentLike[], today: Date = new Date()) {
  const emi = sumRupees(loans.filter(l => (l.outstandingAmount || 0) > 0).map(l => l.emiAmount));
  const rd = deposits
    .filter(d => d.type === 'RD' && (!d.maturityDate || new Date(d.maturityDate) >= today))
    .map(d => d.monthlyDepositAmount);
  const rdTotal = sumRupees(rd);
  const chit = sumRupees(chits.filter(c => (c.pendingInstallments || 0) > 0).map(c => c.monthlyInstallment));
  return { emi, rd: rdTotal, chit };
}

export interface InvestmentLike { type?: string; name?: string; currentValue?: number; investedAmount?: number }

const MF_TYPES = ['mutual fund', 'sip'];
const STOCK_TYPES = ['stock', 'stock / equity', 'equity'];

/** Each investment lands in exactly one bucket: gold, then silver, then mutual funds, then stocks, else other. */
export function investmentBuckets(investments: InvestmentLike[]) {
  const buckets = { gold: 0, silver: 0, mf: 0, stocks: 0, other: 0 };
  for (const i of investments) {
    const value = i.currentValue || i.investedAmount || 0;
    const text = `${i.type || ''} ${i.name || ''}`;
    const type = (i.type || '').toLowerCase();
    const key = /gold/i.test(text) ? 'gold' : /silver/i.test(text) ? 'silver' : MF_TYPES.includes(type) ? 'mf' : STOCK_TYPES.includes(type) ? 'stocks' : 'other';
    buckets[key] = sumRupees([buckets[key], value]);
  }
  return buckets;
}

interface LinkedEntry { type?: string; amount?: number; expenseDate?: string; linkedIncomeSource?: { id?: string } | null }

/**
 * Sprint 6 (S6-03): the ledger is the source of truth (ADR-001). Each income source takes the amount of the latest
 * credit received against it; a source with nothing received yet keeps its expected amount.
 */
export function withLedgerAmounts<T extends { id?: string; amount?: number }>(sources: T[], entries: LinkedEntry[]): T[] {
  const latest = new Map<string, { date: string; amount: number }>();
  for (const e of entries) {
    const id = e.linkedIncomeSource?.id;
    if (!id || e.type !== 'CREDIT' || !e.expenseDate) continue;
    const seen = latest.get(id);
    if (!seen || e.expenseDate > seen.date) latest.set(id, { date: e.expenseDate, amount: e.amount || 0 });
  }
  return sources.map((s) => (s.id && latest.has(s.id) ? { ...s, amount: latest.get(s.id)!.amount } : s));
}

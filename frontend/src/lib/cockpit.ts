/**
 * Money-cockpit maths, kept out of the page so it can be tested (Sprint 3, S3-14).
 * Amounts are rupees per month unless stated.
 */

/** Average over the last 3 full months; a month with no entries counts as zero. */
export function averageOverThreeMonths(byMonth: Map<string, number>): number {
  const total = Array.from(byMonth.values()).reduce((a, b) => a + b, 0);
  return total / 3;
}

export interface IncomeSourceLike {
  sourceName?: string;
  amount?: number;
  frequency?: string;
}

const isSalary = (s: IncomeSourceLike) => (s.sourceName || '').toLowerCase().includes('salary');

function perMonth(s: IncomeSourceLike): number {
  const amount = s.amount || 0;
  if (s.frequency === 'Yearly') return amount / 12;
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
    : sources.filter(isSalary).reduce((s, i) => s + perMonth(i), 0);
  const side = sources.filter(s => !isSalary(s)).reduce((s, i) => s + perMonth(i), 0);
  return { salary, side };
}

export interface LoanLike { emiAmount?: number; outstandingAmount?: number }
export interface DepositLike { type?: string; monthlyDepositAmount?: number; maturityDate?: string }
export interface ChitInstallmentLike { monthlyInstallment?: number; pendingInstallments?: number }

/** Monthly EMIs, RD deposits and chit installments still running on {@code today}. */
export function fixedOutflows(loans: LoanLike[], deposits: DepositLike[], chits: ChitInstallmentLike[], today: Date = new Date()) {
  const emi = loans.filter(l => (l.outstandingAmount || 0) > 0).reduce((s, l) => s + (l.emiAmount || 0), 0);
  const rd = deposits
    .filter(d => d.type === 'RD' && (!d.maturityDate || new Date(d.maturityDate) >= today))
    .reduce((s, d) => s + (d.monthlyDepositAmount || 0), 0);
  const chit = chits.filter(c => (c.pendingInstallments || 0) > 0).reduce((s, c) => s + (c.monthlyInstallment || 0), 0);
  return { emi, rd, chit };
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
    if (/gold/i.test(text)) buckets.gold += value;
    else if (/silver/i.test(text)) buckets.silver += value;
    else if (MF_TYPES.includes(type)) buckets.mf += value;
    else if (STOCK_TYPES.includes(type)) buckets.stocks += value;
    else buckets.other += value;
  }
  return buckets;
}

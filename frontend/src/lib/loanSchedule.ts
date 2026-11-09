import { toPaise, mulRateRupeeP, roundRupeeP } from './money';
/**
 * A loan's full EMI schedule (Sprint 5): every instalment with its due date, principal and interest split,
 * closing balance, foreclosure amount and whether it is paid. Amounts are whole rupees, as on bank schedules.
 * Interest follows the backend LoanMath: MONTHLY = balance x rate / 12; DAILY_365 = balance x rate x days / 365.
 */

export type InstallmentStatus = 'PAID' | 'OVERDUE' | 'DUE' | 'UPCOMING';

export interface LoanTerms {
  principal: number;
  ratePercent: number;
  emi: number;
  tenureMonths: number;
  firstEmiDate?: string | null;
  disbursementDate?: string | null;
  method?: string | null;
  foreclosureRate?: number | null;
  foreclosureLockInMonths?: number | null;
  paidInstallmentsOpening?: number | null;
}

export interface ScheduleOptions {
  /** Months ('YYYY-MM') with an EMI recorded in the ledger. */
  paidMonths?: string[];
  today?: string | Date;
}

export interface InstallmentRow {
  no: number;
  dueDate: string;
  opening: number;
  emi: number;
  principal: number;
  interest: number;
  closing: number;
  foreclosureEligible: boolean;
  foreclosureCharge: number;
  amountToClose: number;
  status: InstallmentStatus;
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** The same day of the month, {@code k} months later (clamped to the month's last day). */
function addMonths(start: Date, k: number): Date {
  const target = new Date(start.getFullYear(), start.getMonth() + k, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(start.getDate(), last));
  return target;
}

const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);

// Sprint 7 T2: schedule rows stay in whole rupees (as on bank statements), but every product of a rate is
// computed exactly in paise and rounded half-up once — never on rupee floats.
const wholeRupees = (rupees: number) => roundRupeeP(toPaise(rupees)) / 100;
const rateOn = (rupees: number, ratePercent: number, num: number, den: number) =>
  mulRateRupeeP(toPaise(rupees), ratePercent || 0, num, den) / 100;
const interestFor = (balance: number, ratePercent: number, daily: boolean, from: Date, to: Date) =>
  daily ? rateOn(balance, ratePercent, daysBetween(from, to), 365) : rateOn(balance, ratePercent, 1, 12);

export function buildLoanSchedule(terms: LoanTerms, options: ScheduleOptions = {}): InstallmentRow[] {
  const { principal, ratePercent, emi, tenureMonths, firstEmiDate } = terms;
  if (!firstEmiDate || !principal || principal <= 0 || !emi || emi <= 0 || !tenureMonths || tenureMonths <= 0) return [];

  const first = parse(firstEmiDate);
  const daily = terms.method === 'DAILY_365';
  const lockIn = terms.foreclosureLockInMonths ?? 0;
  const opening0 = terms.paidInstallmentsOpening ?? 0;
  const paidMonths = new Set(options.paidMonths ?? []);
  const today = options.today ? (typeof options.today === 'string' ? parse(options.today) : options.today) : new Date();
  today.setHours(0, 0, 0, 0);

  const rows: InstallmentRow[] = [];
  let balance = wholeRupees(principal);
  let previous = terms.disbursementDate ? parse(terms.disbursementDate) : addMonths(first, -1);

  for (let no = 1; no <= tenureMonths && balance > 0; no++) {
    const due = addMonths(first, no - 1);
    const interest = interestFor(balance, ratePercent, daily, previous, due);
    let principalPart = emi - interest;
    if (no === tenureMonths || principalPart >= balance) principalPart = balance;
    principalPart = Math.max(0, principalPart);

    const eligible = no > lockIn;
    const charge = eligible && terms.foreclosureRate ? rateOn(balance, terms.foreclosureRate, 1, 1) : 0;
    const dueIso = iso(due);
    const paid = no <= opening0 || paidMonths.has(dueIso.slice(0, 7));
    const sameMonth = due.getFullYear() === today.getFullYear() && due.getMonth() === today.getMonth();

    rows.push({
      no, dueDate: dueIso, opening: balance, emi: principalPart + interest, principal: principalPart, interest,
      closing: balance - principalPart, foreclosureEligible: eligible, foreclosureCharge: charge,
      amountToClose: balance + charge,
      status: paid ? 'PAID' : due < today ? 'OVERDUE' : sameMonth ? 'DUE' : 'UPCOMING',
    });
    balance -= principalPart;
    previous = due;
  }
  return rows;
}

export function scheduleSummary(rows: InstallmentRow[]) {
  const paidRows = rows.filter((r) => r.status === 'PAID');
  const principal = rows.reduce((s, r) => s + r.principal, 0);
  const principalRepaid = paidRows.reduce((s, r) => s + r.principal, 0);
  return {
    total: rows.length,
    paid: paidRows.length,
    remaining: rows.length - paidRows.length,
    overdue: rows.filter((r) => r.status === 'OVERDUE').length,
    principalRepaid,
    interestPaid: paidRows.reduce((s, r) => s + r.interest, 0),
    totalInterest: rows.reduce((s, r) => s + r.interest, 0),
    outstanding: principal - principalRepaid,
    next: rows.find((r) => r.status !== 'PAID'),
  };
}

export interface ProjectionTerms {
  outstanding: number;
  ratePercent: number;
  emi: number;
  /** Day of the month the EMI is debited (default 5). */
  emiDay?: number | null;
  method?: string | null;
}

/**
 * Sprint 6 (S6-01): the remaining EMIs of a loan whose statement details (tenure, first EMI date) are not entered,
 * projected from today's outstanding balance. Earlier instalments are unknown, so every row is still to pay.
 */
export function projectedSchedule(terms: ProjectionTerms, options: { today?: string | Date } = {}): InstallmentRow[] {
  const { outstanding, emi } = terms;
  if (!outstanding || outstanding <= 0 || !emi || emi <= 0) return [];
  const daily = terms.method === 'DAILY_365';
  const day = Math.min(Math.max(terms.emiDay || 5, 1), 28);
  const today = options.today ? (typeof options.today === 'string' ? parse(options.today) : new Date(options.today)) : new Date();
  today.setHours(0, 0, 0, 0);

  let first = new Date(today.getFullYear(), today.getMonth(), day);
  if (first < today) first = addMonths(first, 1);

  const rows: InstallmentRow[] = [];
  let balance = wholeRupees(outstanding);
  let previous = addMonths(first, -1);
  for (let no = 1; balance > 0 && no <= 600; no++) {
    const due = addMonths(first, no - 1);
    const interest = interestFor(balance, terms.ratePercent, daily, previous, due);
    if (no === 1 && emi <= interest) return [];
    const principalPart = Math.min(balance, emi - interest);
    const sameMonth = due.getFullYear() === today.getFullYear() && due.getMonth() === today.getMonth();
    rows.push({
      no, dueDate: iso(due), opening: balance, emi: principalPart + interest, principal: principalPart, interest,
      closing: balance - principalPart, foreclosureEligible: false, foreclosureCharge: 0, amountToClose: balance,
      status: sameMonth ? 'DUE' : 'UPCOMING',
    });
    balance -= principalPart;
    previous = due;
  }
  return rows;
}

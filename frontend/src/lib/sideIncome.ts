/**
 * Sprint 8 S8-6: side income at a glance — per source, the last payment received, the next one due,
 * and plain wording ("Overdue by 92 days", never "-92 days left"). The ledger is the source of truth (ADR-001).
 */
import { addP, fromPaise, toPaise } from './money';

export interface IncomeSourceLike { id?: string; sourceName?: string; amount?: number; frequency?: string }
export interface Entry {
  id?: string; type?: string; amount?: number; expenseDate?: string; category?: string | null; madeAgainst?: string | null;
  description?: string | null; linkedIncomeSource?: { id?: string; sourceName?: string } | null;
  linkedAccount?: { id?: string; bankName?: string; name?: string } | null;
}

/** "5 Oct 2026" (Indian style); "—" when there is no date. */
export const shortDate = (iso: string | null | undefined) =>
  iso ? new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** Months between payments for each frequency the app offers. */
export const FREQUENCIES = ['Monthly', 'Quarterly', 'Half-yearly', 'Yearly', 'One-time'] as const;
const STEP: Record<string, number> = { Monthly: 1, Quarterly: 3, 'Half-yearly': 6, Yearly: 12 };
const PERIOD: Record<number, string> = { 1: 'month', 3: 'quarter', 6: 'half-year', 12: 'year' };

/** Every payment received as side income — linked to a source, recorded against one, or categorised as side income. Newest first. */
export function sideIncomeEntries<T extends Entry>(entries: T[]): T[] {
  return entries
    .filter((e) => e.type === 'CREDIT' && (!!e.linkedIncomeSource?.id || e.madeAgainst === 'INCOME_SOURCE' || /side income/i.test(e.category ?? '')))
    .sort((a, b) => (b.expenseDate ?? '').localeCompare(a.expenseDate ?? ''));
}

/** Received this calendar month and this Indian financial year (April–March), exact to the paisa. */
export function sideIncomeTotals(entries: Entry[], today: string | Date = new Date()) {
  const t = typeof today === 'string' ? today.slice(0, 10) : iso(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const [y, m] = t.split('-').map(Number);
  const fyStart = `${m >= 4 ? y : y - 1}-04-01`;
  const month = t.slice(0, 7);
  let thisMonth = 0, thisYear = 0;
  for (const e of entries) {
    const d = (e.expenseDate ?? '').slice(0, 10);
    if (!d || d > t) continue;
    const p = toPaise(e.amount ?? 0);
    if (d.startsWith(month)) thisMonth = addP(thisMonth, p);
    if (d >= fyStart) thisYear = addP(thisYear, p);
  }
  return { thisMonth: fromPaise(thisMonth), thisYear: fromPaise(thisYear) };
}

export type SideIncomeStatus = 'RECEIVED' | 'DUE' | 'OVERDUE' | 'UPCOMING' | 'NONE' | 'ONE_TIME';

export interface SideIncomeRow {
  id: string;
  name: string;
  frequency: string;
  expected: number;
  lastDate: string | null;
  lastAmount: number | null;
  nextDue: string | null;
  status: SideIncomeStatus;
  label: string;
  /** Payments due since the last one and not yet received. */
  missed: number;
  history: { id?: string; date: string; amount: number; bank?: string; note?: string }[];
}

const DAY = 86400000;
const parse = (s: string) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d); };
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const addMonths = (t: number, n: number) => {
  const d = new Date(t);
  const target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1);
  const last = new Date(Date.UTC(new Date(target).getUTCFullYear(), new Date(target).getUTCMonth() + 1, 0)).getUTCDate();
  return Date.UTC(new Date(target).getUTCFullYear(), new Date(target).getUTCMonth(), Math.min(d.getUTCDate(), last));
};
const short = (t: number) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function sideIncomeRows(sources: IncomeSourceLike[], entries: Entry[], today: string | Date = new Date()): SideIncomeRow[] {
  const now = typeof today === 'string' ? parse(today) : Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return sources.map((s) => {
    const history = entries
      .filter((e) => e.type === 'CREDIT' && e.expenseDate && e.linkedIncomeSource?.id === s.id)
      .map((e) => ({ id: e.id, date: e.expenseDate!.slice(0, 10), amount: e.amount || 0,
        bank: e.linkedAccount?.bankName || e.linkedAccount?.name || undefined, note: e.description || undefined }))
      .sort((a, b) => b.date.localeCompare(a.date));
    const last = history[0] ?? null;
    const base = { id: s.id || '', name: s.sourceName || '', frequency: s.frequency || 'Monthly',
      expected: last ? last.amount : s.amount || 0, lastDate: last?.date ?? null, lastAmount: last?.amount ?? null, history };

    if (s.frequency === 'One-time') return { ...base, nextDue: null, status: 'ONE_TIME', label: last ? 'One-time payment received' : 'One-time · not received', missed: 0 };
    if (!last) return { ...base, nextDue: null, status: 'NONE', label: 'No payment yet', missed: 0 };

    const step = STEP[s.frequency || 'Monthly'] ?? 1;
    const lastT = parse(last.date);
    const next = addMonths(lastT, step);
    const d = new Date(now);
    const lastD = new Date(lastT);
    const thisPeriod = step === 1
      ? lastD.getUTCFullYear() === d.getUTCFullYear() && lastD.getUTCMonth() === d.getUTCMonth()
      : now < next;
    if (thisPeriod) {
      return { ...base, nextDue: iso(next), status: 'RECEIVED', label: `Received this ${PERIOD[step]} · next ${short(next)}`, missed: 0 };
    }
    const days = Math.round((next - now) / DAY);
    if (days < 0) {
      let missed = 0;
      for (let t = next; t <= now; t = addMonths(t, step)) missed++;
      return { ...base, nextDue: iso(next), status: 'OVERDUE', label: `Overdue by ${plural(-days, 'day')}`, missed };
    }
    if (days <= 7) return { ...base, nextDue: iso(next), status: 'DUE', label: days === 0 ? 'Due today' : `Due in ${plural(days, 'day')}`, missed: 0 };
    return { ...base, nextDue: iso(next), status: 'UPCOMING', label: `Due on ${short(next)}`, missed: 0 };
  });
}

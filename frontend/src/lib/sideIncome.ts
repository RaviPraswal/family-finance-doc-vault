/**
 * Sprint 8 S8-6: side income at a glance — per source, the last payment received, the next one due,
 * and plain wording ("Overdue by 92 days", never "-92 days left"). The ledger is the source of truth (ADR-001).
 */
export interface IncomeSourceLike { id?: string; sourceName?: string; amount?: number; frequency?: string }
interface Entry { type?: string; amount?: number; expenseDate?: string; linkedIncomeSource?: { id?: string } | null }

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
  history: { date: string; amount: number }[];
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
      .map((e) => ({ date: e.expenseDate!.slice(0, 10), amount: e.amount || 0 }))
      .sort((a, b) => b.date.localeCompare(a.date));
    const last = history[0] ?? null;
    const base = { id: s.id || '', name: s.sourceName || '', frequency: s.frequency || 'Monthly',
      expected: last ? last.amount : s.amount || 0, lastDate: last?.date ?? null, lastAmount: last?.amount ?? null, history };

    if (s.frequency === 'One-time') return { ...base, nextDue: null, status: 'ONE_TIME', label: last ? 'One-time payment received' : 'One-time · not received', missed: 0 };
    if (!last) return { ...base, nextDue: null, status: 'NONE', label: 'No payment yet', missed: 0 };

    const step = s.frequency === 'Yearly' ? 12 : 1;
    const lastT = parse(last.date);
    const next = addMonths(lastT, step);
    const d = new Date(now);
    const lastD = new Date(lastT);
    const thisPeriod = step === 1
      ? lastD.getUTCFullYear() === d.getUTCFullYear() && lastD.getUTCMonth() === d.getUTCMonth()
      : now < next;
    if (thisPeriod) {
      return { ...base, nextDue: iso(next), status: 'RECEIVED', label: `Received this ${step === 1 ? 'month' : 'year'} · next ${short(next)}`, missed: 0 };
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

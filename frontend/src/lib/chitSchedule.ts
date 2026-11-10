import { addP, fromPaise, toPaise } from './money';
/** A chit fund's month-by-month schedule with what is paid and what is left (Sprint 5). */

export interface ChitScheduleRow {
  srNo: number;
  monthCycle: string;
  calendarMonth: string;
  calendarYear: number;
  actualAmount: number;
  chitAmountAllocated: number;
  status: 'Paid & Closed' | 'Allotted' | 'Open / Pending';
}

export type ChitDisplay = 'PAID' | 'ALLOTTED' | 'OVERDUE' | 'DUE' | 'UPCOMING';
export interface ChitDisplayRow extends ChitScheduleRow { display: ChitDisplay; depositedToDate: number }

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const monthIndex = (name: string) => MONTHS.indexOf(String(name || '').trim().slice(0, 3).toLowerCase());
const isPaid = (r: ChitScheduleRow) => r.status === 'Paid & Closed' || r.status === 'Allotted';

export function chitRows(schedule: ChitScheduleRow[], today: Date = new Date()): ChitDisplayRow[] {
  const now = today.getFullYear() * 12 + today.getMonth();
  let depositedP = 0; // Sprint 7 T2: sum in paise
  return schedule.map((r) => {
    if (isPaid(r)) depositedP = addP(depositedP, toPaise(r.actualAmount));
    const when = r.calendarYear * 12 + monthIndex(r.calendarMonth);
    const display: ChitDisplay = r.status === 'Paid & Closed' ? 'PAID'
      : r.status === 'Allotted' ? 'ALLOTTED'
      : when < now ? 'OVERDUE' : when === now ? 'DUE' : 'UPCOMING';
    return { ...r, display, depositedToDate: fromPaise(depositedP) };
  });
}

export function chitSummary(rows: ChitDisplayRow[]) {
  const pending = rows.filter((r) => r.display !== 'PAID' && r.display !== 'ALLOTTED');
  return {
    total: rows.length,
    paid: rows.length - pending.length,
    remaining: pending.length,
    overdue: pending.filter((r) => r.display === 'OVERDUE').length,
    deposited: rows.length ? rows[rows.length - 1].depositedToDate : 0,
    remainingAmount: fromPaise(addP(...pending.map((r) => toPaise(r.actualAmount)))),
    next: pending[0],
  };
}

/** Marks every pending month up to and including {@code srNo} as paid; allotted and later months are unchanged. */
export function markPaidThrough(schedule: ChitScheduleRow[], srNo: number): ChitScheduleRow[] {
  return schedule.map((r) => (r.srNo <= srNo && r.status === 'Open / Pending' ? { ...r, status: 'Paid & Closed' } : r));
}

// Sprint 8 hardening: a chit whose stored schedule is malformed (older format, hand-edited, broken JSON) must not
// crash the page. Missing or odd fields are taken from the generated schedule; numbers are coerced.
type Status = 'Paid & Closed' | 'Allotted' | 'Open / Pending';
export interface StoredChitRow {
  srNo: number; monthCycle: string; calendarMonth: string; calendarYear: number;
  actualAmount: number; chitAmountAllocated: number; status: Status;
}
const STATUSES: Status[] = ['Paid & Closed', 'Allotted', 'Open / Pending'];
const num = (v: unknown, fallback: number) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

export function parseChitSchedule(json: string | null | undefined, generated: StoredChitRow[]): StoredChitRow[] {
  if (!json) return generated;
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { return generated; }
  if (!Array.isArray(raw)) return generated;
  return raw.map((r: Record<string, unknown>, i) => {
    const g = generated[i] ?? generated[generated.length - 1] ?? { srNo: i + 1, monthCycle: `Cycle ${i + 1}`, calendarMonth: '', calendarYear: 0, actualAmount: 0, chitAmountAllocated: 0, status: 'Open / Pending' as Status };
    const row = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    return {
      srNo: num(row.srNo, i + 1),
      monthCycle: typeof row.monthCycle === 'string' ? row.monthCycle : g.monthCycle,
      calendarMonth: typeof row.calendarMonth === 'string' ? row.calendarMonth : g.calendarMonth,
      calendarYear: num(row.calendarYear, g.calendarYear),
      actualAmount: num(row.actualAmount ?? row.actualDue, g.actualAmount),
      chitAmountAllocated: num(row.chitAmountAllocated, g.chitAmountAllocated),
      status: STATUSES.includes(row.status as Status) ? (row.status as Status) : 'Open / Pending',
    };
  });
}

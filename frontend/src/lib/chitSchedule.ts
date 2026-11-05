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
  let deposited = 0;
  return schedule.map((r) => {
    if (isPaid(r)) deposited += r.actualAmount || 0;
    const when = r.calendarYear * 12 + monthIndex(r.calendarMonth);
    const display: ChitDisplay = r.status === 'Paid & Closed' ? 'PAID'
      : r.status === 'Allotted' ? 'ALLOTTED'
      : when < now ? 'OVERDUE' : when === now ? 'DUE' : 'UPCOMING';
    return { ...r, display, depositedToDate: deposited };
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
    remainingAmount: pending.reduce((s, r) => s + (r.actualAmount || 0), 0),
    next: pending[0],
  };
}

/** Marks every pending month up to and including {@code srNo} as paid; allotted and later months are unchanged. */
export function markPaidThrough(schedule: ChitScheduleRow[], srNo: number): ChitScheduleRow[] {
  return schedule.map((r) => (r.srNo <= srNo && r.status === 'Open / Pending' ? { ...r, status: 'Paid & Closed' } : r));
}

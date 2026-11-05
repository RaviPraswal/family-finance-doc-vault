import { useMemo } from 'react';
import { chitRows, chitSummary, type ChitDisplay, type ChitScheduleRow } from '../lib/chitSchedule';

interface Props {
  name: string;
  schedule: ChitScheduleRow[];
  onStatusChange: (rowIndex: number, status: ChitScheduleRow['status']) => void;
  onPaidThrough: (srNo: number) => void;
}

const PILL: Record<ChitDisplay, { label: string; cls: string }> = {
  PAID: { label: 'Paid', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  ALLOTTED: { label: 'Allotted', cls: 'bg-primary/15 text-primary' },
  OVERDUE: { label: 'Overdue', cls: 'bg-red-500/15 text-red-700 dark:text-red-300' },
  DUE: { label: 'Due this month', cls: 'bg-amber-500/20 text-amber-800 dark:text-amber-300' },
  UPCOMING: { label: 'Upcoming', cls: 'bg-muted text-muted-foreground' },
};
const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

/** Every month of a chit: instalment, chit amount, total paid so far and status, with a catch-up action (Sprint 5). */
export default function ChitScheduleTable({ name, schedule, onStatusChange, onPaidThrough }: Props) {
  const rows = useMemo(() => chitRows(schedule), [schedule]);
  const s = chitSummary(rows);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold">{s.paid} of {s.total} paid</span>
        <span className="px-3 py-1.5 rounded-full bg-muted font-semibold">{s.remaining} remaining</span>
        {s.overdue > 0 && <span className="px-3 py-1.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 font-semibold">{s.overdue} overdue</span>}
        <span className="px-3 py-1.5 rounded-full bg-muted font-semibold">Paid so far {inr(s.deposited)}</span>
        <span className="px-3 py-1.5 rounded-full bg-muted font-semibold">Still to pay {inr(s.remainingAmount)}</span>
        {s.next && <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary font-semibold">Next: {s.next.calendarMonth} {s.next.calendarYear} · {inr(s.next.actualAmount)}</span>}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table aria-label={`Chit schedule for ${name}`} className="min-w-full text-xs tabular-nums">
          <thead className="bg-muted/50">
            <tr className="text-left text-muted-foreground uppercase tracking-wider">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Month</th>
              <th className="px-3 py-2 text-right">Instalment</th>
              <th className="px-3 py-2 text-right">Chit amount</th>
              <th className="px-3 py-2 text-right">Paid to date</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((r, i) => {
              const pending = r.status === 'Open / Pending';
              return (
                <tr key={r.srNo} className={r.display === 'DUE' ? 'bg-amber-500/10' : r.display === 'ALLOTTED' ? 'bg-primary/5' : ''}>
                  <td className="px-3 py-1.5 text-muted-foreground">{r.srNo}</td>
                  <td className="px-3 py-1.5 font-semibold">{r.calendarMonth} {r.calendarYear}</td>
                  <td className="px-3 py-1.5 text-right font-semibold">{inr(r.actualAmount)}</td>
                  <td className="px-3 py-1.5 text-right">{r.chitAmountAllocated ? inr(r.chitAmountAllocated) : '—'}</td>
                  <td className="px-3 py-1.5 text-right">{inr(r.depositedToDate)}</td>
                  <td className="px-3 py-1.5">
                    {pending ? (
                      <label className="inline-flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PILL[r.display].cls}`}>{PILL[r.display].label}</span>
                        <select
                          aria-label={`Status of ${r.calendarMonth} ${r.calendarYear}`}
                          value={r.status}
                          onChange={(e) => onStatusChange(i, e.target.value as ChitScheduleRow['status'])}
                          className="ml-1 px-1.5 py-0.5 rounded border border-border bg-background text-[10px]"
                        >
                          <option value="Open / Pending">Pending</option>
                          <option value="Paid & Closed">Paid</option>
                          <option value="Allotted">Allotted to me</option>
                        </select>
                      </label>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PILL[r.display].cls}`}>{PILL[r.display].label}</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {pending && (
                      <button
                        type="button"
                        onClick={() => onPaidThrough(r.srNo)}
                        aria-label={`Paid up to here (${r.calendarMonth} ${r.calendarYear})`}
                        className="px-2 py-1 rounded-lg border border-border text-[10px] font-semibold hover:bg-muted"
                      >
                        Paid up to here
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

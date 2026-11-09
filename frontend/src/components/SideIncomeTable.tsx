import { Fragment, useState } from 'react';
import type { SideIncomeRow, SideIncomeStatus } from '../lib/sideIncome';
import { formatINR, toPaise } from '../lib/money';

const PILL: Record<SideIncomeStatus, string> = {
  RECEIVED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  DUE: 'bg-amber-500/20 text-amber-800 dark:text-amber-300',
  OVERDUE: 'bg-red-500/15 text-red-700 dark:text-red-300',
  UPCOMING: 'bg-muted text-muted-foreground',
  NONE: 'bg-muted text-muted-foreground',
  ONE_TIME: 'bg-primary/10 text-primary',
};
const inr = (n: number | null) => (n === null ? '—' : formatINR(toPaise(n)));
const date = (iso: string | null) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** Sprint 8 S8-6: every side-income source in one list — last entry, next due, status, and its history on demand. */
export default function SideIncomeTable({ rows }: { rows: SideIncomeRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table aria-label="Side income sources" className="min-w-full text-xs tabular-nums">
        <thead className="bg-muted/50">
          <tr className="text-left text-muted-foreground uppercase tracking-wider">
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Last received</th>
            <th className="px-3 py-2 text-right">Amount</th>
            <th className="px-3 py-2">Next due</th>
            <th className="px-3 py-2 text-right">Expected</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2"><span className="sr-only">History</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((r) => (
            <Fragment key={r.id}>
              <tr className={r.status === 'OVERDUE' ? 'bg-red-500/5' : r.status === 'DUE' ? 'bg-amber-500/10' : ''}>
                <td className="px-3 py-2 font-semibold">{r.name}<span className="block text-[10px] font-normal text-muted-foreground">{r.frequency}</span></td>
                <td className="px-3 py-2">{date(r.lastDate)}</td>
                <td className="px-3 py-2 text-right">{inr(r.lastAmount)}</td>
                <td className="px-3 py-2">{date(r.nextDue)}</td>
                <td className="px-3 py-2 text-right font-semibold">{inr(r.expected)}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PILL[r.status]}`}>{r.label}</span>
                  {r.missed > 1 && <span className="ml-1 text-[10px] text-red-600 dark:text-red-300">{r.missed} payments missed</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.history.length > 0 && (
                    <button type="button" aria-expanded={open === r.id} aria-label={`History for ${r.name}`} onClick={() => setOpen(open === r.id ? null : r.id)}
                      className="px-2 py-1 rounded-lg border border-border text-[10px] font-semibold hover:bg-muted">
                      {open === r.id ? 'Hide' : `History (${r.history.length})`}
                    </button>
                  )}
                </td>
              </tr>
              {open === r.id && (
                <tr className="bg-muted/20">
                  <td colSpan={7} className="px-3 py-2">
                    <ul className="flex flex-wrap gap-2">
                      {r.history.map((h) => (
                        <li key={h.date + h.amount} className="px-2 py-1 rounded-lg bg-background border border-border">{inr(h.amount)} on {date(h.date)}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

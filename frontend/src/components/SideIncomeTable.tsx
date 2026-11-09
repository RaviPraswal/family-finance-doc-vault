import { Fragment, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { shortDate, type SideIncomeRow, type SideIncomeStatus } from '../lib/sideIncome';
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

interface Props {
  rows: SideIncomeRow[];
  onRecord?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

/**
 * Sprint 8: every side-income source in one list — last payment, next due, status — with Record payment, Edit and
 * Delete on each row (always visible), and the payments received for a source on demand.
 */
export default function SideIncomeTable({ rows, onRecord, onEdit, onDelete }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table aria-label="Side income sources" className="min-w-full text-sm tabular-nums">
        <thead className="bg-muted/50">
          <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Last received</th>
            <th className="px-3 py-2 text-right">Amount</th>
            <th className="px-3 py-2">Next due</th>
            <th className="px-3 py-2 text-right">Expected</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2 text-right"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((r) => (
            <Fragment key={r.id}>
              <tr className={r.status === 'OVERDUE' ? 'bg-red-500/5' : r.status === 'DUE' ? 'bg-amber-500/10' : ''}>
                <td className="px-3 py-2 font-semibold">{r.name}<span className="block text-[11px] font-normal text-muted-foreground">{r.frequency}</span></td>
                <td className="px-3 py-2">{shortDate(r.lastDate)}</td>
                <td className="px-3 py-2 text-right">{inr(r.lastAmount)}</td>
                <td className="px-3 py-2">{shortDate(r.nextDue)}</td>
                <td className="px-3 py-2 text-right font-semibold">{inr(r.expected)}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${PILL[r.status]}`}>{r.label}</span>
                  {r.missed > 1 && <span className="ml-1 text-[11px] text-red-600 dark:text-red-300">{r.missed} payments missed</span>}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                    {r.history.length > 0 && (
                      <button type="button" aria-expanded={open === r.id} aria-label={`History for ${r.name}`} onClick={() => setOpen(open === r.id ? null : r.id)}
                        className="px-2 py-1 rounded-lg border border-border text-[11px] font-semibold hover:bg-muted">
                        {open === r.id ? 'Hide' : `History (${r.history.length})`}
                      </button>
                    )}
                    {onRecord && (
                      <button type="button" onClick={() => onRecord(r.id)} aria-label={`Record payment for ${r.name}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90">
                        <Plus className="h-3.5 w-3.5" /> Payment
                      </button>
                    )}
                    {onEdit && (
                      <button type="button" onClick={() => onEdit(r.id)} aria-label={`Edit ${r.name}`} title="Edit"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                    )}
                    {onDelete && (
                      <button type="button" onClick={() => onDelete(r.id)} aria-label={`Delete ${r.name}`} title="Delete"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
              {open === r.id && (
                <tr className="bg-muted/20">
                  <td colSpan={7} className="px-3 py-2">
                    <ul className="flex flex-wrap gap-2 text-xs">
                      {r.history.map((h) => (
                        <li key={(h.id ?? h.date) + h.amount} className="px-2 py-1 rounded-lg bg-background border border-border">
                          {inr(h.amount)} on {shortDate(h.date)}{h.bank ? ` · ${h.bank}` : ''}{h.note ? ` · ${h.note}` : ''}
                        </li>
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

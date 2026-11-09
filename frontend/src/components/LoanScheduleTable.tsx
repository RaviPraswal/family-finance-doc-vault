import { useEffect, useMemo, useState } from 'react';
import { buildLoanSchedule, projectedSchedule, scheduleSummary, type InstallmentStatus, type LoanTerms } from '../lib/loanSchedule';

interface Props {
  loan: LoanTerms & { lenderName?: string; outstanding?: number | null };
  /** Ledger entries; DEBITs linked to this loan mark their month's EMI as paid. */
  entries: { linkedLoan?: { id?: string } | null; expenseDate?: string; type?: string }[];
  loanId: string;
}

const STATUS: Record<InstallmentStatus, { label: string; cls: string }> = {
  PAID: { label: 'Paid', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  OVERDUE: { label: 'Overdue', cls: 'bg-red-500/15 text-red-700 dark:text-red-300' },
  DUE: { label: 'Due', cls: 'bg-amber-500/20 text-amber-800 dark:text-amber-300' },
  UPCOMING: { label: 'Upcoming', cls: 'bg-muted text-muted-foreground' },
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const date = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });

/** Every EMI of a loan: due date, split, closing balance, foreclosure amount and paid status (Sprint 5). */
export default function LoanScheduleTable({ loan, entries, loanId }: Props) {
  const paidMonths = useMemo(
    () => entries.filter((e) => e.linkedLoan?.id === loanId && e.type !== 'CREDIT' && e.expenseDate).map((e) => e.expenseDate!.slice(0, 7)),
    [entries, loanId],
  );
  const full = useMemo(() => buildLoanSchedule(loan, { paidMonths }), [loan, paidMonths]);
  // Sprint 6: without the statement details, project the remaining EMIs from today's outstanding balance.
  const projected = full.length === 0;
  const rows = useMemo(
    () => (projected
      ? projectedSchedule({ outstanding: loan.outstanding ?? 0, ratePercent: loan.ratePercent, emi: loan.emi, method: loan.method,
          emiDay: loan.firstEmiDate ? Number(loan.firstEmiDate.slice(8, 10)) : 5 })
      : full),
    [projected, full, loan],
  );
  const summary = scheduleSummary(rows);

  // Sprint 8 S8-4: 12 EMIs a page, opening on the page with the next EMI to pay.
  const PAGE = 12;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const nextIndex = rows.findIndex((r) => r.status !== 'PAID');
  const startPage = nextIndex < 0 ? pages - 1 : Math.floor(nextIndex / PAGE);
  const [page, setPage] = useState(startPage);
  useEffect(() => setPage(startPage), [startPage, rows.length]);
  const visible = rows.slice(page * PAGE, page * PAGE + PAGE);
  const pageNumbers = Array.from({ length: pages }, (_, i) => i)
    .filter((i) => pages <= 7 || Math.abs(i - page) <= 2 || i === 0 || i === pages - 1);
  const showClose = !!loan.foreclosureRate;

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-4">
        Add the loan's outstanding amount, EMI and interest rate (Edit loan) to see its EMI schedule.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {projected && (
        <p className="text-xs text-muted-foreground bg-muted/30 rounded-xl px-3 py-2">
          Projected from today's outstanding of {inr(loan.outstanding ?? 0)}. Add the tenure and first EMI date from your loan statement (Edit loan) to also see the EMIs already paid.
        </p>
      )}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold">{summary.paid} of {summary.total} paid</span>
        <span className="px-3 py-1.5 rounded-full bg-muted font-semibold">{summary.remaining} remaining</span>
        {summary.overdue > 0 && <span className="px-3 py-1.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 font-semibold">{summary.overdue} overdue</span>}
        <span className="px-3 py-1.5 rounded-full bg-muted font-semibold">Principal repaid {inr(summary.principalRepaid)}</span>
        <span className="px-3 py-1.5 rounded-full bg-muted font-semibold">Interest paid {inr(summary.interestPaid)} of {inr(summary.totalInterest)}</span>
        <span className="px-3 py-1.5 rounded-full bg-muted font-semibold">Outstanding {inr(summary.outstanding)}</span>
        {summary.next && <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary font-semibold">Next: #{summary.next.no} on {date(summary.next.dueDate)} · {inr(summary.next.emi)}</span>}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table aria-label={`EMI schedule${loan.lenderName ? ` for ${loan.lenderName}` : ''}`} className="min-w-full text-xs tabular-nums">
          <thead className="bg-muted/50 sticky top-0">
            <tr className="text-left text-muted-foreground uppercase tracking-wider">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Due date</th>
              <th className="px-3 py-2 text-right">Opening</th>
              <th className="px-3 py-2 text-right">EMI</th>
              <th className="px-3 py-2 text-right">Principal</th>
              <th className="px-3 py-2 text-right">Interest</th>
              <th className="px-3 py-2 text-right">Closing</th>
              {showClose && <th className="px-3 py-2 text-right">To close now</th>}
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {visible.map((r) => (
              <tr key={r.no} className={r.status === 'DUE' ? 'bg-amber-500/10' : r.status === 'PAID' ? 'opacity-80' : ''}>
                <td className="px-3 py-1.5 text-muted-foreground">{r.no}</td>
                <td className="px-3 py-1.5 font-semibold">{date(r.dueDate)}</td>
                <td className="px-3 py-1.5 text-right">{inr(r.opening)}</td>
                <td className="px-3 py-1.5 text-right font-semibold">{inr(r.emi)}</td>
                <td className="px-3 py-1.5 text-right">{inr(r.principal)}</td>
                <td className="px-3 py-1.5 text-right">{inr(r.interest)}</td>
                <td className="px-3 py-1.5 text-right">{inr(r.closing)}</td>
                {showClose && (
                  <td className="px-3 py-1.5 text-right">
                    {r.foreclosureEligible ? <span title={`Includes ${inr(r.foreclosureCharge)} charge`}>{inr(r.amountToClose)}</span> : <span className="text-muted-foreground">Not eligible</span>}
                  </td>
                )}
                <td className="px-3 py-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav aria-label="EMI schedule pages" className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">
            EMIs {page * PAGE + 1}–{Math.min(rows.length, page * PAGE + PAGE)} of {rows.length}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)}
              className="px-2.5 py-1 rounded-lg border border-border disabled:opacity-40 hover:bg-muted">‹</button>
            {pageNumbers.map((i, k) => (
              <span key={i} className="flex items-center">
                {k > 0 && i - pageNumbers[k - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
                <button type="button" aria-label={`Page ${i + 1}`} aria-current={i === page ? 'page' : undefined} onClick={() => setPage(i)}
                  className={`min-w-7 px-2 py-1 rounded-lg border ${i === page ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>{i + 1}</button>
              </span>
            ))}
            <button type="button" aria-label="Next page" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}
              className="px-2.5 py-1 rounded-lg border border-border disabled:opacity-40 hover:bg-muted">›</button>
          </div>
        </nav>
      )}
    </div>
  );
}

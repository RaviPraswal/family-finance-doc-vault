import { useMemo, useState } from 'react';
import { buildSsySchedule, ssySummary, SSY_RATE, type SsyStatus } from '../lib/ssySchedule';

export interface SsyInvestment {
  id: string;
  name: string;
  investedAmount: number;
  startDate?: string | null;
  yearlyContribution?: number | null;
  interestRate?: number | null;
}

interface Props {
  investment: SsyInvestment;
  onSaveTerms: (terms: { startDate: string; yearlyContribution: number; interestRate: number }) => void;
}

const STATUS: Record<SsyStatus, { label: string; cls: string }> = {
  PAID: { label: 'Paid', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  OVERDUE: { label: 'Missed', cls: 'bg-red-500/15 text-red-700 dark:text-red-300' },
  DUE: { label: 'Due this year', cls: 'bg-amber-500/20 text-amber-800 dark:text-amber-300' },
  UPCOMING: { label: 'Upcoming', cls: 'bg-muted text-muted-foreground' },
  GROWING: { label: 'Interest only', cls: 'bg-primary/10 text-primary' },
};
const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const date = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** A Sukanya Samriddhi account year by year: 15 years of deposits, interest every year, maturity at 21 years (Sprint 6). */
export default function SsyScheduleTable({ investment, onSaveTerms }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    startDate: investment.startDate ?? '',
    yearlyContribution: investment.yearlyContribution ? String(investment.yearlyContribution) : '',
    interestRate: String(investment.interestRate ?? SSY_RATE),
  });
  const rows = useMemo(() => buildSsySchedule({
    startDate: investment.startDate, yearlyDeposit: investment.yearlyContribution,
    ratePercent: investment.interestRate, deposited: investment.investedAmount,
  }), [investment]);
  const s = ssySummary(rows);

  const termsForm = (
    <form
      className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-muted/30 rounded-xl p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSaveTerms({ startDate: form.startDate, yearlyContribution: Number(form.yearlyContribution), interestRate: Number(form.interestRate) || SSY_RATE });
        setEditing(false);
      }}
    >
      <label className="text-xs font-semibold text-muted-foreground">Account opened on
        <input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="mt-1 w-full p-2 rounded-lg bg-background text-foreground border border-border text-sm" />
      </label>
      <label className="text-xs font-semibold text-muted-foreground">Yearly deposit (₹)
        <input required type="number" min={250} max={150000} value={form.yearlyContribution} onChange={(e) => setForm({ ...form, yearlyContribution: e.target.value })} className="mt-1 w-full p-2 rounded-lg bg-background text-foreground border border-border text-sm" />
      </label>
      <label className="text-xs font-semibold text-muted-foreground">Interest rate (%)
        <input type="number" step="0.1" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} className="mt-1 w-full p-2 rounded-lg bg-background text-foreground border border-border text-sm" />
      </label>
      <button type="submit" className="px-4 py-2 text-sm bg-primary text-white rounded-lg">Save</button>
    </form>
  );

  if (rows.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Add the account's opening date and yearly deposit to see every year until it matures.</p>
        {termsForm}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold">{s.paid} of 15 deposits made</span>
        {s.overdue > 0 && <span className="px-3 py-1.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 font-semibold">{s.overdue} missed</span>}
        <span className="px-3 py-1.5 rounded-full bg-muted font-semibold">Total deposits {inr(s.totalDeposits)}</span>
        <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary font-semibold">Matures {date(s.maturityDate)} · {inr(s.maturityValue)}</span>
        <button type="button" onClick={() => setEditing(!editing)} className="ml-auto px-3 py-1.5 rounded-lg border border-border font-semibold hover:bg-muted">
          {editing ? 'Close' : 'Edit details'}
        </button>
      </div>
      {editing && termsForm}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table aria-label={`Sukanya Samriddhi schedule for ${investment.name}`} className="min-w-full text-xs tabular-nums">
          <thead className="bg-muted/50">
            <tr className="text-left text-muted-foreground uppercase tracking-wider">
              <th className="px-3 py-2">Year</th>
              <th className="px-3 py-2">From</th>
              <th className="px-3 py-2 text-right">Opening</th>
              <th className="px-3 py-2 text-right">Deposit</th>
              <th className="px-3 py-2 text-right">Interest</th>
              <th className="px-3 py-2 text-right">Closing</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((r) => (
              <tr key={r.year} className={r.status === 'DUE' ? 'bg-amber-500/10' : ''}>
                <td className="px-3 py-1.5 text-muted-foreground">{r.year}</td>
                <td className="px-3 py-1.5 font-semibold">{date(r.startDate)}</td>
                <td className="px-3 py-1.5 text-right">{inr(r.opening)}</td>
                <td className="px-3 py-1.5 text-right font-semibold">{r.deposit ? inr(r.deposit) : '—'}</td>
                <td className="px-3 py-1.5 text-right">{inr(r.interest)}</td>
                <td className="px-3 py-1.5 text-right">{inr(r.closing)}</td>
                <td className="px-3 py-1.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">Paid years are counted from the amount invested so far. Interest uses today's rate; the government resets it every quarter.</p>
    </div>
  );
}

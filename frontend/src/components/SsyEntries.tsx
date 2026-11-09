import { useMemo } from 'react';
import { Link2 } from 'lucide-react';
import { formatINR, toPaise } from '../lib/money';
import { linkCandidates, ssyEntries, type LedgerEntry } from '../lib/ssyEntries';

interface Props {
  investment: { id: string; name: string; investedAmount: number };
  entries: LedgerEntry[];
  onLink: (entry: LedgerEntry) => void;
}

const inr = (rupees: number) => formatINR(toPaise(rupees));
const date = (iso: string) => new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Sprint 8 · S8-3: every entry made into the account so far, and stray entries that look like they belong to it. */
export default function SsyEntries({ investment, entries, onLink }: Props) {
  const { rows, total } = useMemo(() => ssyEntries(entries, investment.id), [entries, investment.id]);
  const candidates = useMemo(() => linkCandidates(entries, investment), [entries, investment]);
  const differs = rows.length > 0 && toPaise(total) !== toPaise(investment.investedAmount);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <h3 className="text-sm font-bold text-foreground mr-2">Entries so far</h3>
        <span className="px-3 py-1.5 rounded-full bg-muted font-semibold">
          {rows.length} {rows.length === 1 ? 'entry' : 'entries'} · {inr(total)} paid in
        </span>
        {differs && (
          <span className="px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold">
            Invested amount on the account is {inr(investment.investedAmount)}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No entries are linked to this account yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table aria-label={`Entries for ${investment.name}`} className="min-w-full text-xs tabular-nums">
            <thead className="bg-muted/50">
              <tr className="text-left text-muted-foreground uppercase tracking-wider">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Note</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-right">Running total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-1.5 font-semibold">{date(r.date)}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{r.note}</td>
                  <td className={`px-3 py-1.5 text-right font-semibold ${r.signedAmount < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{inr(r.signedAmount)}</td>
                  <td className="px-3 py-1.5 text-right">{inr(r.runningTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {candidates.length > 0 && (
        <div className="rounded-xl border border-dashed border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">These entries may belong to this account but are not linked:</p>
          <ul className="space-y-1.5">
            {candidates.map((c) => (
              <li key={c.id} className="flex items-center gap-3 text-xs">
                <span className="w-24 shrink-0 font-semibold">{date(c.expenseDate)}</span>
                <span className="flex-1 truncate text-muted-foreground">{c.description || c.category}</span>
                <span className="font-semibold tabular-nums">{inr(c.amount)}</span>
                <button
                  type="button"
                  onClick={() => onLink(c)}
                  aria-label={`Link ${c.description || c.category} of ${date(c.expenseDate)}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border font-semibold hover:bg-muted"
                >
                  <Link2 className="h-3.5 w-3.5" /> Link
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

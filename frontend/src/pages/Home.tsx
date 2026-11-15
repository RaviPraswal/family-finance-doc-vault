import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Landmark, Plus, Scale } from 'lucide-react';
import { apiClient } from '../api/client';
import { formatINR, sumRupees, toPaise } from '../lib/money';
import { MONEY_IN, MONEY_OUT, OWE, OWN, monthSummary, ownedBreakdown, owedBreakdown, type Group } from '../lib/simpleMoney';
import AddEntry from '../components/AddEntry';
import { PrimaryAction } from '../components/ui/LiquidControls';

/**
 * Sprint 9 Home: the whole family's money as four plain cards — Money In, Money Out, Savings & Investments, Debts —
 * plus what you are worth. The detailed overview stays one tap away.
 */
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const inr = (r: number) => formatINR(toPaise(r));
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (key: string) => new Date(`${key}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const shift = (key: string, by: number) => { const d = new Date(`${key}-01T00:00:00`); d.setMonth(d.getMonth() + by); return monthKey(d); };

const OWN_LINK: Record<string, string> = {
  'Bank & cash': 'bank-accounts', 'Fixed savings': 'deposits', 'Market investments': 'investments', 'Long-term schemes': 'investments',
  'Gold & property': 'investments', 'Chit funds': 'chit-funds', 'Money others owe you': 'money-owed-to-me',
};
const OWE_LINK: Record<string, string> = {
  'Home & vehicle loans': 'loans', 'Personal & education loans': 'loans', 'Credit cards': 'credit-cards',
  'Chit instalments still to pay': 'chit-funds', 'Money you borrowed from people': 'money-i-borrowed',
};

function Card({ id, title, hint, total, totalTone, icon, groups, values, links, footer }: {
  id: string; title: string; hint: string; total: number; totalTone?: string; icon: ReactNode;
  groups: Group[]; values: Record<string, number>; links?: Record<string, string>; footer?: ReactNode;
}) {
  const shown = groups.filter((g) => values[g.name]);
  return (
    <section aria-labelledby={`${id}-title`} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-base font-bold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <span className="shrink-0 text-muted-foreground" aria-hidden="true">{icon}</span>
      </div>
      <p className={`text-2xl font-black tabular-nums ${totalTone ?? 'text-foreground'}`}>{inr(total)}</p>
      {shown.length > 0 ? (
        <ul className="space-y-1.5 text-sm">
          {shown.map((g) => {
            const label = links?.[g.name]
              ? <Link to={`/dashboard/${links[g.name]}`} className="hover:underline" title={g.hint}>{g.name}</Link>
              : <span title={g.hint}>{g.name}</span>;
            return (
              <li key={g.name} className="flex items-center justify-between gap-3">
                {label}
                <span className="tabular-nums font-semibold">{inr(values[g.name])}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      )}
      {footer}
    </section>
  );
}

export default function Home() {
  const [month, setMonth] = useState(monthKey(new Date()));
  const [d, setD] = useState<Record<string, Row[]> | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const urls = { expenses: '/api/expenses', accounts: '/api/bankaccounts', deposits: '/api/deposits', investments: '/api/investments',
      chits: '/api/chitfunds', udhaar: '/api/peerlendings', loans: '/api/loans', cards: '/api/creditcards' };
    const rows = await Promise.all(Object.entries(urls).map(async ([k, u]) => {
      try { const r = await apiClient(u); return [k, Array.isArray(r) ? r : []] as const; } catch { return [k, []] as const; }
    }));
    setD(Object.fromEntries(rows));
  }, []);
  useEffect(() => {
    load();
    // an entry added from the menu's Add entry button
    window.addEventListener('finnest:entry-saved', load);
    return () => window.removeEventListener('finnest:entry-saved', load);
  }, [load]);

  const m = useMemo(() => monthSummary(d?.expenses ?? [], month), [d, month]);
  const own = useMemo(() => ownedBreakdown({ accounts: d?.accounts ?? [], deposits: d?.deposits ?? [], investments: d?.investments ?? [],
    chits: d?.chits ?? [], udhaar: d?.udhaar ?? [] }), [d]);
  const owe = useMemo(() => owedBreakdown({ loans: d?.loans ?? [], cards: d?.cards ?? [], chits: d?.chits ?? [], udhaar: d?.udhaar ?? [] }), [d]);
  const worth = sumRupees([own.total, -owe.total]);
  const isThisMonth = month === monthKey(new Date());

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="glass-panel bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Home</h1>
          <p className="text-sm text-muted-foreground">Everything in four parts: what comes in, what goes out, what you own and what you owe.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
            <button type="button" onClick={() => setMonth(shift(month, -1))} aria-label="Previous month" className="p-1.5 rounded-lg hover:bg-muted">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-sm font-semibold min-w-[8.5rem] text-center" aria-live="polite">{monthLabel(month)}</span>
            <button type="button" onClick={() => setMonth(shift(month, 1))} disabled={isThisMonth} aria-label="Next month"
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <PrimaryAction icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            Add entry
          </PrimaryAction>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">What you're worth</p>
          <p className={`text-3xl font-black tabular-nums ${worth < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>{d ? inr(worth) : '…'}</p>
          <p className="text-xs text-muted-foreground">What you own minus what you owe, today.</p>
        </div>
        <p className="text-sm text-muted-foreground">You own <span className="font-semibold text-foreground">{inr(own.total)}</span> · you owe <span className="font-semibold text-foreground">{inr(owe.total)}</span></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card id="money-in" title="Money In" hint={`What you earned in ${monthLabel(month)}`} total={m.moneyIn.total}
          totalTone="text-emerald-700 dark:text-emerald-400" icon={<ArrowDownLeft className="h-5 w-5" />}
          groups={MONEY_IN} values={m.moneyIn.groups}
          footer={<Link to="/dashboard/income" className="text-xs font-semibold text-primary hover:underline mt-auto">Side income sources</Link>} />
        <Card id="money-out" title="Money Out" hint={`What you spent in ${monthLabel(month)} — it is gone`} total={m.moneyOut.total}
          icon={<ArrowUpRight className="h-5 w-5" />} groups={MONEY_OUT} values={m.moneyOut.groups}
          footer={
            <div className="mt-auto space-y-1 text-xs">
              {m.moneyOut.refunds > 0 && <p className="text-muted-foreground">Refunds took off {inr(m.moneyOut.refunds)}</p>}
              {m.unsortedCount > 0 && (
                <Link to="/dashboard/expenses" className="block font-semibold text-amber-800 dark:text-amber-300 hover:underline">
                  {m.unsortedCount} {m.unsortedCount === 1 ? 'entry' : 'entries'} not sorted yet ({inr(m.moneyOut.unsorted)})
                </Link>
              )}
              <Link to="/dashboard/budgets" className="block font-semibold text-primary hover:underline">Spending limits</Link>
            </div>
          } />
        <Card id="own" title="Savings & Investments" hint="What you own today" total={own.total} icon={<Landmark className="h-5 w-5" />}
          groups={OWN} values={own.groups} links={OWN_LINK} />
        <Card id="owe" title="Debts" hint="What you owe today" total={owe.total} totalTone={owe.total > 0 ? 'text-red-700 dark:text-red-400' : undefined}
          icon={<Scale className="h-5 w-5" />} groups={OWE} values={owe.groups} links={OWE_LINK} />
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <p><span className="block text-xs text-muted-foreground">Left over in {monthLabel(month)}</span>
          <span className={`font-bold tabular-nums ${m.left < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{inr(m.left)}</span>
          <span className="block text-[11px] text-muted-foreground">Money in − money out − loan interest</span></p>
        <p><span className="block text-xs text-muted-foreground">Moved into savings & debts</span>
          <span className="font-bold tabular-nums"> {inr(m.movedToSavingsAndDebts)}</span>
          <span className="block text-[11px] text-muted-foreground">SIPs, RDs, EMIs, card bills — not spending</span></p>
        <p><span className="block text-xs text-muted-foreground">Loan interest paid</span>
          <span className="font-bold tabular-nums">{inr(m.loanInterest)}</span>
          <span className="block text-[11px] text-muted-foreground">The cost part of your EMIs</span></p>
      </div>

      <p className="text-center text-sm">
        <Link to="/dashboard/portfolio" className="font-semibold text-primary hover:underline">Open the full overview</Link>
      </p>

      <AddEntry open={adding} onClose={() => setAdding(false)} onSaved={load} />
    </div>
  );
}

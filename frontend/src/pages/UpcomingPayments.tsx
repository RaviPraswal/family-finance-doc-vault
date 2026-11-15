import { useSearchParams } from 'react-router-dom';
import Commitments from './Commitments';
import Ledger from './Ledger';

/**
 * Sprint 9 stage 3: one place for what is coming up. "This month's plan" is the Monthly Commitments screen;
 * "Scheduled & due" is the scheduled-payments ledger (with the AI schedule reader). Both screens are unchanged inside.
 */
const TABS = [
  { key: 'plan', label: "This month's plan" },
  { key: 'scheduled', label: 'Scheduled & due' },
] as const;

export default function UpcomingPayments() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'scheduled' ? 'scheduled' : 'plan';
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-foreground">Upcoming payments</h1>
        <div role="tablist" aria-label="Upcoming payments" className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setParams(t.key === 'plan' ? {} : { tab: t.key })}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === t.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel">{tab === 'plan' ? <Commitments /> : <Ledger />}</div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { DashboardAlert } from '../lib/alerts';

/** The cockpit's list of money items that need the family's attention, most urgent first. */
export default function NeedsAttention({ alerts }: { alerts: DashboardAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <section aria-labelledby="needs-attention-title" className="bg-card rounded-2xl border border-border p-4">
      <h2 id="needs-attention-title" className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-amber-500" /> Needs attention
        <span className="text-xs font-semibold text-muted-foreground">{alerts.length}</span>
      </h2>
      <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {alerts.map((a, i) => (
          <li key={i}>
            <Link
              to={a.actionPath}
              className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border/60 bg-background/40 hover:border-primary/50 transition-colors"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{a.title}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{a.message}</span>
              </span>
              <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                a.type === 'LOW_BALANCE' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300' : 'bg-red-500/15 text-red-600 dark:text-red-300'
              }`}>
                {a.type === 'LOW_BALANCE' ? 'Low' : 'Overdue'}
              </span>
              <ArrowRight aria-hidden="true" className="sr-only" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

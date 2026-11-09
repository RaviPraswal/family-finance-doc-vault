import { udhaarByPerson, udhaarTotals, type UdhaarEntry } from '../lib/udhaar';
import { formatINR, toPaise } from '../lib/money';

const inr = (n: number) => formatINR(toPaise(n));

/** Sprint 8 S8-5: the final view — who owes me, whom I owe, and the net with each person. */
export default function UdhaarPeople({ entries }: { entries: UdhaarEntry[] }) {
  const people = udhaarByPerson(entries);
  const t = udhaarTotals(entries);
  if (people.length === 0) return null;
  return (
    <section aria-labelledby="udhaar-people" className="mb-6 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="udhaar-people" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Who owes whom</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold">Owed to you {inr(t.owedToMe)}</span>
          <span className="px-3 py-1.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 font-semibold">You owe {inr(t.iOwe)}</span>
          <span className="px-3 py-1.5 rounded-full bg-muted font-semibold">Net {t.net >= 0 ? '+' : ''}{inr(t.net)}</span>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table aria-label="Who owes whom" className="min-w-full text-xs tabular-nums">
          <thead className="bg-muted/50">
            <tr className="text-left text-muted-foreground uppercase tracking-wider">
              <th className="px-3 py-2">Person</th>
              <th className="px-3 py-2 text-right">You gave</th>
              <th className="px-3 py-2 text-right">Got back</th>
              <th className="px-3 py-2 text-right">You took</th>
              <th className="px-3 py-2 text-right">You repaid</th>
              <th className="px-3 py-2">Where it stands</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {people.map((p) => (
              <tr key={p.name.toLowerCase()}>
                <td className="px-3 py-2 font-semibold">{p.name}</td>
                <td className="px-3 py-2 text-right">{p.given ? inr(p.given) : '—'}</td>
                <td className="px-3 py-2 text-right">{p.receivedBack ? inr(p.receivedBack) : '—'}</td>
                <td className="px-3 py-2 text-right">{p.taken ? inr(p.taken) : '—'}</td>
                <td className="px-3 py-2 text-right">{p.repaidByMe ? inr(p.repaidByMe) : '—'}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.net > 0 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : p.net < 0 ? 'bg-red-500/15 text-red-700 dark:text-red-300' : 'bg-muted text-muted-foreground'}`}>{p.label}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

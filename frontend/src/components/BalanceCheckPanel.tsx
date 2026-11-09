import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Scale } from 'lucide-react';
import { apiClient } from '../api/client';
import { formatINR, toPaise } from '../lib/money';
import { checkStatus, cleanAmount, differenceP } from '../lib/balanceCheck';

interface Account { id: string; bankName: string; currentBalance: number }
interface LatestCheck { accountId: string; checkDate: string; difference: number }
interface Props { accounts: Account[]; today?: string; onDone: () => void }

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Sprint 8 · S8-1: enter each bank's real closing balance. The server posts any difference to the ledger as one
 * "Balance adjustment" entry, so the app balance matches the bank again (nothing is posted when they match).
 */
export default function BalanceCheckPanel({ accounts, today = localToday(), onDone }: Props) {
  const [latest, setLatest] = useState<Record<string, LatestCheck>>({});
  const [entered, setEntered] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const loadLatest = async () => {
    try {
      const list: LatestCheck[] = await apiClient('/api/bankaccounts/balance-checks/latest');
      setLatest(Object.fromEntries((list ?? []).map((c) => [c.accountId, c])));
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => { loadLatest(); }, []);

  const unchecked = useMemo(
    () => accounts.filter((a) => !checkStatus(latest[a.id]?.checkDate, today).checkedToday).length,
    [accounts, latest, today],
  );
  const toSave = accounts.filter((a) => cleanAmount(entered[a.id] ?? '') !== null);

  const save = async () => {
    setSaving(true);
    let adjusted = 0;
    try {
      for (const a of toSave) {
        const r = await apiClient(`/api/bankaccounts/${a.id}/balance-checks`, {
          method: 'POST',
          body: JSON.stringify({ actualBalance: cleanAmount(entered[a.id]), checkDate: today }),
        });
        if (r?.adjustmentId) adjusted++;
      }
      setResult(`${toSave.length} checked · ${adjusted === 0 ? 'all matched' : `${adjusted} adjusted to match the bank`}`);
      setEntered({});
      await loadLatest();
      onDone();
    } catch (err: any) {
      setResult(err?.message || 'Could not save the balances.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="balance-check-title" className="mb-6 bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Scale className="h-4 w-4 text-primary" />
        <h2 id="balance-check-title" className="text-base font-bold text-foreground">Daily balance check</h2>
        {unchecked > 0 ? (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-800 dark:text-amber-300">
            {unchecked} {unchecked === 1 ? 'account' : 'accounts'} not checked today
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> All checked today
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Enter the closing balance your bank shows. Any difference is added to the ledger as one balance adjustment.</p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table aria-label="Daily balance check" className="min-w-full text-sm tabular-nums">
          <thead className="bg-muted/50">
            <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-3 py-2">Account</th>
              <th className="px-3 py-2 text-right">In the app</th>
              <th className="px-3 py-2">Bank shows</th>
              <th className="px-3 py-2 text-right">Difference</th>
              <th className="px-3 py-2">Last check</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {accounts.map((a) => {
              const status = checkStatus(latest[a.id]?.checkDate, today);
              const diff = differenceP(entered[a.id] ?? '', a.currentBalance);
              return (
                <tr key={a.id}>
                  <td className="px-3 py-2 font-semibold">{a.bankName}</td>
                  <td className="px-3 py-2 text-right">{formatINR(toPaise(a.currentBalance), { decimals: 2 })}</td>
                  <td className="px-3 py-2">
                    <input
                      inputMode="decimal"
                      aria-label={`Bank shows for ${a.bankName}`}
                      placeholder="₹"
                      value={entered[a.id] ?? ''}
                      onChange={(e) => setEntered({ ...entered, [a.id]: e.target.value })}
                      className="w-36 p-1.5 rounded-lg bg-background text-foreground border border-border text-sm"
                    />
                  </td>
                  <td className={`px-3 py-2 text-right font-semibold ${diff === null || diff === 0 ? 'text-muted-foreground' : diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {diff === null ? '—' : diff === 0 ? 'Matches' : formatINR(diff, { decimals: 2 })}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs font-semibold ${status.checkedToday ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>{status.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || toSave.length === 0}
          className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save balances'}
        </button>
        {result && <p role="status" className="text-xs text-muted-foreground">{result}</p>}
      </div>
    </section>
  );
}

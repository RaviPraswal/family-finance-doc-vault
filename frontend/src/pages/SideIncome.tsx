import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Download, Printer, Banknote } from 'lucide-react';
import SideIncomeTable from '../components/SideIncomeTable';
import { FREQUENCIES, shortDate, sideIncomeEntries, sideIncomeRows, sideIncomeTotals, type Entry } from '../lib/sideIncome';
import { formatINR, toPaise } from '../lib/money';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import { PrimaryAction, SearchBox, SecondaryAction } from '../components/ui/LiquidControls';

interface IncomeSource {
  id: string;
  sourceName: string;
  ownerName: string;
  amount: number;
  frequency: string;
  dateReceived?: string | null;
}
interface BankAccount { id: string; name?: string; bankName: string }
type Payment = Entry & { id: string; expenseDate: string; amount: number };

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const inr = (n: number) => formatINR(toPaise(n));
const PAGE = 10;
const field = 'w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary outline-none text-sm';
const labelCls = 'block text-xs font-semibold text-muted-foreground mb-1';

/**
 * Sprint 8 rebuild (reported by Ravi as a family member, 2026-11-09): one list of sources with Record payment, Edit and
 * Delete on each row; the add/edit form has the expected amount and how often it comes; every payment received is
 * listed with its date, source, amount and bank.
 */
export default function SideIncome() {
  const toast = useToastStore();
  const confirm = useConfirmStore();
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [expenses, setExpenses] = useState<Payment[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);

  const [sourceForm, setSourceForm] = useState<{ open: boolean; editing: IncomeSource | null; sourceName: string; ownerName: string; amount: string; frequency: string }>(
    { open: false, editing: null, sourceName: '', ownerName: '', amount: '', frequency: 'Monthly' });
  const [payForm, setPayForm] = useState<{ source: IncomeSource | null; amount: string; bankAccountId: string; date: string; note: string }>(
    { source: null, amount: '', bankAccountId: '', date: today(), note: '' });
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [filterSourceId, setFilterSourceId] = useState('ALL');
  const [page, setPage] = useState(1);

  const load = async () => {
    const [s, e, b] = await Promise.allSettled([apiClient('/api/incomesources'), apiClient('/api/expenses'), apiClient('/api/bankaccounts')]);
    if (s.status === 'fulfilled') setSources(s.value ?? []);
    if (e.status === 'fulfilled') setExpenses(e.value ?? []);
    if (b.status === 'fulfilled') setBanks(b.value ?? []);
    if ([s, e, b].some((r) => r.status === 'rejected')) toast.error('Could not load everything', 'Some side income data did not load. Please refresh.');
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => sideIncomeRows(sources, expenses), [sources, expenses]);
  const payments = useMemo(() => sideIncomeEntries(expenses), [expenses]);
  const totals = useMemo(() => sideIncomeTotals(payments), [payments]);
  const overdue = rows.filter((r) => r.status === 'OVERDUE').length;

  const filtered = useMemo(() => payments.filter((p) => {
    const q = search.trim().toLowerCase();
    const text = `${p.linkedIncomeSource?.sourceName ?? ''} ${p.category ?? ''} ${p.description ?? ''} ${p.linkedAccount?.bankName ?? ''}`.toLowerCase();
    return (!q || text.includes(q)) && (filterSourceId === 'ALL' || p.linkedIncomeSource?.id === filterSourceId);
  }), [payments, search, filterSourceId]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const shown = filtered.slice((page - 1) * PAGE, page * PAGE);
  const sourceName = (p: Payment) => p.linkedIncomeSource?.sourceName
    || sources.find((s) => s.id === p.linkedIncomeSource?.id)?.sourceName || p.category || 'Side income';

  const openAdd = () => setSourceForm({ open: true, editing: null, sourceName: '', ownerName: '', amount: '', frequency: 'Monthly' });
  const openEdit = (id: string) => {
    const s = sources.find((x) => x.id === id);
    if (s) setSourceForm({ open: true, editing: s, sourceName: s.sourceName, ownerName: s.ownerName ?? '', amount: s.amount ? String(s.amount) : '', frequency: s.frequency || 'Monthly' });
  };
  const openPayment = (id: string) => {
    const s = sources.find((x) => x.id === id) ?? null;
    const expected = rows.find((r) => r.id === id)?.expected;
    setPayForm({ source: s, amount: expected ? String(expected) : '', bankAccountId: '', date: today(), note: '' });
  };

  const saveSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body = { sourceName: sourceForm.sourceName.trim(), ownerName: sourceForm.ownerName.trim(), amount: Number(sourceForm.amount) || 0, frequency: sourceForm.frequency };
    try {
      if (sourceForm.editing) {
        await apiClient(`/api/incomesources/${sourceForm.editing.id}`, { method: 'PUT', body: JSON.stringify({ ...sourceForm.editing, ...body }) });
      } else {
        await apiClient('/api/incomesources', { method: 'POST', body: JSON.stringify(body) });
      }
      toast.success('Source saved', `${body.sourceName} is saved.`);
      setSourceForm((f) => ({ ...f, open: false }));
      load();
    } catch (err: any) {
      toast.error('Could not save the source', err.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const savePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payForm.source) return;
    setSaving(true);
    try {
      await apiClient('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(payForm.amount),
          category: 'Side Income',
          expenseDate: payForm.date,
          description: payForm.note || null,
          type: 'CREDIT',
          madeAgainst: 'INCOME_SOURCE',
          linkedAccount: payForm.bankAccountId ? { id: payForm.bankAccountId } : null,
          linkedIncomeSource: { id: payForm.source.id },
        }),
      });
      toast.success('Payment recorded', `${inr(Number(payForm.amount))} from ${payForm.source.sourceName}.`);
      setPayForm((f) => ({ ...f, source: null }));
      load();
    } catch (err: any) {
      toast.error('Could not record the payment', err.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSource = (id: string) => {
    const s = sources.find((x) => x.id === id);
    confirm.show({
      title: 'Delete income source',
      message: `Delete ${s?.sourceName ?? 'this source'}? Payments already recorded stay in your ledger.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await apiClient(`/api/incomesources/${id}`, { method: 'DELETE' });
          toast.success('Source deleted', `${s?.sourceName ?? 'The source'} was removed.`);
          load();
        } catch (err: any) {
          toast.error('Could not delete the source', err.message || 'It may still have payments linked to it.');
        }
      },
    });
  };

  const deletePayment = (p: Payment) => {
    confirm.show({
      title: 'Delete payment',
      message: `Delete the payment of ${inr(p.amount)} on ${shortDate(p.expenseDate)}? Your bank balance will be adjusted.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await apiClient(`/api/expenses/${p.id}`, { method: 'DELETE' });
          toast.success('Payment deleted', 'The entry was removed from your ledger.');
          load();
        } catch (err: any) {
          toast.error('Could not delete the payment', err.message || 'Please try again.');
        }
      },
    });
  };

  const exportRows = () => filtered.map((p) => [p.expenseDate, sourceName(p), p.amount, p.linkedAccount?.bankName ?? '', p.description ?? '']);
  const headers = ['Date', 'Source', 'Amount', 'Bank', 'Note'];

  return (
    <div className="min-h-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Side Income</h1>
          <p className="text-sm text-muted-foreground">Each source, when it last paid, what is due next, and every payment received.</p>
        </div>
        <PrimaryAction onClick={openAdd} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90" icon={<Plus className="h-4 w-4" />}>Add source</PrimaryAction>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground">Received this month</p>
          <p className="text-xl font-bold tabular-nums mt-1">{inr(totals.thisMonth)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground">Received this financial year</p>
          <p className="text-xl font-bold tabular-nums mt-1">{inr(totals.thisYear)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground">Sources</p>
          <p className="text-xl font-bold mt-1">{sources.length} <span className={`text-sm font-semibold ${overdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>· {overdue} overdue</span></p>
        </div>
      </div>

      <section aria-labelledby="sources-title" className="space-y-2">
        <h2 id="sources-title" className="text-sm font-bold text-foreground">Sources</h2>
        {sources.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            <Banknote className="h-6 w-6 mx-auto mb-2 opacity-60" />
            No side income sources yet. Add one to track when it pays.
          </div>
        ) : (
          <SideIncomeTable rows={rows} onRecord={openPayment} onEdit={openEdit} onDelete={deleteSource} />
        )}
      </section>

      <section aria-labelledby="payments-title" className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="payments-title" className="text-sm font-bold text-foreground">Payments received</h2>
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search" ariaLabel="Search payments"
              iconClassName="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" inputClassName="pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-sm w-48" />
            <select aria-label="Filter by source" value={filterSourceId} onChange={(e) => { setFilterSourceId(e.target.value); setPage(1); }}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm">
              <option value="ALL">All sources</option>
              {sources.map((s) => <option key={s.id} value={s.id}>{s.sourceName}</option>)}
            </select>
            <SecondaryAction onClick={() => exportToCSV(exportRows(), headers, 'Side_Income_Payments')} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-semibold hover:bg-muted" icon={<Download className="h-3.5 w-3.5" />}>CSV</SecondaryAction>
            <SecondaryAction onClick={() => exportToPDF('Side income payments', headers, exportRows(), 'Side_Income_Payments')} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-semibold hover:bg-muted" icon={<Printer className="h-3.5 w-3.5" />}>PDF</SecondaryAction>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table aria-label="Payments received" className="min-w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Bank</th>
                <th className="px-3 py-2">Note</th>
                <th className="px-3 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {shown.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  {payments.length === 0 ? 'No payments recorded yet. Use “Payment” on a source to record one.' : 'No payments match your search.'}
                </td></tr>
              ) : shown.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2 whitespace-nowrap">{shortDate(p.expenseDate)}</td>
                  <td className="px-3 py-2 font-semibold">{sourceName(p)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{inr(p.amount)}</td>
                  <td className="px-3 py-2">{p.linkedAccount?.bankName || p.linkedAccount?.name || '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.description || '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => deletePayment(p)} aria-label={`Delete payment of ${inr(p.amount)} on ${shortDate(p.expenseDate)}`}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > PAGE && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Payments {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, filtered.length)} of {filtered.length}</span>
            <div className="flex gap-1">
              <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border border-border rounded-lg disabled:opacity-40">Previous</button>
              <button type="button" disabled={page === pages} onClick={() => setPage(page + 1)} className="px-3 py-1 border border-border rounded-lg disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </section>

      {sourceForm.open && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="source-form-title" className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border">
            <h2 id="source-form-title" className="text-lg font-bold mb-4">{sourceForm.editing ? 'Edit income source' : 'Add income source'}</h2>
            <form onSubmit={saveSource} className="space-y-4">
              <div>
                <label htmlFor="src-name" className={labelCls}>Source name</label>
                <input id="src-name" required value={sourceForm.sourceName} onChange={(e) => setSourceForm({ ...sourceForm, sourceName: e.target.value })} className={field} placeholder="e.g. Tuition, Rent, Freelance" />
              </div>
              <div>
                <label htmlFor="src-from" className={labelCls}>Received from</label>
                <input id="src-from" required value={sourceForm.ownerName} onChange={(e) => setSourceForm({ ...sourceForm, ownerName: e.target.value })} className={field} placeholder="e.g. Dinesh, Tenant" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="src-amount" className={labelCls}>Expected amount (₹)</label>
                  <input id="src-amount" required type="number" min="0" step="0.01" inputMode="decimal" value={sourceForm.amount}
                    onChange={(e) => setSourceForm({ ...sourceForm, amount: e.target.value })} className={field} placeholder="15000" />
                </div>
                <div>
                  <label htmlFor="src-freq" className={labelCls}>How often</label>
                  <select id="src-freq" value={sourceForm.frequency} onChange={(e) => setSourceForm({ ...sourceForm, frequency: e.target.value })} className={field}>
                    {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <SecondaryAction onClick={() => setSourceForm({ ...sourceForm, open: false })} className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg font-semibold">Cancel</SecondaryAction>
                <PrimaryAction type="submit" disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-50">Save source</PrimaryAction>
              </div>
            </form>
          </div>
        </div>
      )}

      {payForm.source && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="pay-form-title" className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border">
            <h2 id="pay-form-title" className="text-lg font-bold mb-1">Record payment</h2>
            <p className="text-sm text-muted-foreground mb-4">{payForm.source.sourceName}</p>
            <form onSubmit={savePayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pay-amount" className={labelCls}>Amount received (₹)</label>
                  <input id="pay-amount" required type="number" min="0.01" step="0.01" inputMode="decimal" value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className={field} />
                </div>
                <div>
                  <label htmlFor="pay-date" className={labelCls}>Date received</label>
                  <input id="pay-date" required type="date" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} className={field} />
                </div>
              </div>
              <div>
                <label htmlFor="pay-bank" className={labelCls}>Into bank account (optional)</label>
                <select id="pay-bank" value={payForm.bankAccountId} onChange={(e) => setPayForm({ ...payForm, bankAccountId: e.target.value })} className={field}>
                  <option value="">Cash / not in a bank</option>
                  {banks.map((b) => <option key={b.id} value={b.id}>{b.bankName}{b.name ? ` · ${b.name}` : ''}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="pay-note" className={labelCls}>Note (optional)</label>
                <input id="pay-note" value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} className={field} placeholder="e.g. November fee" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <SecondaryAction onClick={() => setPayForm({ ...payForm, source: null })} className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg font-semibold">Cancel</SecondaryAction>
                <PrimaryAction type="submit" disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-50">Save payment</PrimaryAction>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

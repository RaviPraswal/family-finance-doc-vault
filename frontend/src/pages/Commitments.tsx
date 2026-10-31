import React, { useEffect, useState } from 'react';
import { CalendarClock, Plus, Pause, Play, Pencil, Trash2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { useConfirmStore } from '../store/confirmStore';

type Group = 'INCOME' | 'MUST_PAY' | 'LIVING' | 'PAUSABLE';
type Frequency = 'MONTHLY' | 'DAILY' | 'EVERY_N_MONTHS';

interface Commitment {
  id: string;
  name: string;
  group: Group;
  category?: string;
  amount?: number;
  frequency: Frequency;
  intervalMonths?: number;
  dueDay?: number;
  startDate?: string;
  endDate?: string;
  active: boolean;
  linkedLoan?: { id: string } | null;
  linkedChitFund?: { id: string } | null;
  notes?: string;
}

interface PlanLine { id: string; name: string; group: Group; amount: number; dueDay?: number; active: boolean; source: string; }
interface MonthPlan {
  month: string; income: number; mustPay: number; living: number; pausable: number;
  totalOutflow: number; plannedSurplus: number; safeSurplus: number; lines: PlanLine[];
}

const GROUPS: { key: Group; label: string; hint: string }[] = [
  { key: 'INCOME', label: 'Income', hint: 'Salary, family support, rent received' },
  { key: 'MUST_PAY', label: 'Must-pay', hint: 'EMIs, chits, RD, SSY, family support, internet' },
  { key: 'LIVING', label: 'Living', hint: 'Milk, grocery, petrol, mobile, electricity' },
  { key: 'PAUSABLE', label: 'Pause-able', hint: 'SIPs you can stop in a tight month' },
];

const fmt = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const thisMonth = () => new Date().toISOString().slice(0, 7);

const emptyForm = {
  name: '', group: 'MUST_PAY' as Group, category: '', amount: '', frequency: 'MONTHLY' as Frequency,
  intervalMonths: '2', dueDay: '', startDate: '', endDate: '', link: '', notes: '', active: true,
};

export default function Commitments() {
  const toast = useToastStore();
  const confirm = useConfirmStore();
  const [month, setMonth] = useState(thisMonth());
  const [plan, setPlan] = useState<MonthPlan | null>(null);
  const [items, setItems] = useState<Commitment[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [chits, setChits] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    try {
      const [p, list] = await Promise.all([
        apiClient(`/api/commitments/plan?month=${month}`),
        apiClient('/api/commitments'),
      ]);
      setPlan(p);
      setItems(list);
    } catch (err: any) {
      toast.error('Could not load commitments', err.message);
    }
  };

  useEffect(() => { load(); }, [month]);
  useEffect(() => {
    apiClient('/api/loans').then(setLoans).catch(() => setLoans([]));
    apiClient('/api/chitfunds').then(setChits).catch(() => setChits([]));
  }, []);

  const toBody = (c: typeof form) => {
    const [linkType, linkId] = c.link.split(':');
    return {
      name: c.name,
      group: c.group,
      category: c.category || null,
      amount: c.amount === '' ? null : parseFloat(c.amount),
      frequency: c.frequency,
      intervalMonths: c.frequency === 'EVERY_N_MONTHS' ? parseInt(c.intervalMonths) : null,
      dueDay: c.dueDay === '' ? null : parseInt(c.dueDay),
      startDate: c.startDate || null,
      endDate: c.endDate || null,
      active: c.active,
      linkedLoan: linkType === 'loan' ? { id: linkId } : null,
      linkedChitFund: linkType === 'chit' ? { id: linkId } : null,
      notes: c.notes || null,
    };
  };

  const fromEntity = (c: Commitment) => ({
    name: c.name, group: c.group, category: c.category || '',
    amount: c.amount == null ? '' : String(c.amount), frequency: c.frequency,
    intervalMonths: String(c.intervalMonths || 2), dueDay: c.dueDay == null ? '' : String(c.dueDay),
    startDate: c.startDate || '', endDate: c.endDate || '',
    link: c.linkedLoan ? `loan:${c.linkedLoan.id}` : c.linkedChitFund ? `chit:${c.linkedChitFund.id}` : '',
    notes: c.notes || '', active: c.active,
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient(editingId ? `/api/commitments/${editingId}` : '/api/commitments', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(toBody(form)),
      });
      toast.success(editingId ? 'Commitment updated' : 'Commitment added');
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      load();
    } catch (err: any) {
      toast.error('Could not save', err.message);
    }
  };

  const toggle = async (id: string) => {
    const c = items.find(i => i.id === id);
    if (!c) return;
    try {
      await apiClient(`/api/commitments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(toBody({ ...fromEntity(c), active: !c.active })),
      });
      load();
    } catch (err: any) {
      toast.error('Could not update', err.message);
    }
  };

  const remove = (id: string, name: string) => confirm.show({
    title: 'Delete commitment',
    message: `Delete "${name}" from your monthly plan?`,
    confirmLabel: 'Delete',
    danger: true,
    onConfirm: async () => {
      try {
        await apiClient(`/api/commitments/${id}`, { method: 'DELETE' });
        load();
      } catch (err: any) {
        toast.error('Could not delete', err.message);
      }
    },
  });

  const startEdit = (id: string) => {
    const c = items.find(i => i.id === id);
    if (!c) return;
    setForm(fromEntity(c));
    setEditingId(id);
    setShowForm(true);
  };

  const input = 'w-full p-2 rounded-lg bg-background text-foreground border border-border text-sm';
  const linked = form.link !== '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2"><CalendarClock className="h-6 w-6" /> Monthly Commitments</h2>
          <p className="text-muted-foreground">Everything that comes in or must go out each month. Pause a line to see the effect on your headroom.</p>
        </div>
        <div className="flex gap-2 items-center">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className={input} aria-label="Month" />
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }}
            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-90 flex items-center gap-2 whitespace-nowrap"
          >
            {showForm ? 'Cancel' : <><Plus className="h-4 w-4" /> Add</>}
          </button>
        </div>
      </div>

      {plan && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            ['Income', plan.income, 'text-green-500'],
            ['Must-pay', plan.mustPay, 'text-red-500'],
            ['Living', plan.living, 'text-orange-500'],
            ['Pause-able', plan.pausable, 'text-amber-500'],
            ['Headroom', plan.plannedSurplus, plan.plannedSurplus >= 0 ? 'text-green-500' : 'text-red-500'],
            ['Headroom if SIPs paused', plan.safeSurplus, plan.safeSurplus >= 0 ? 'text-green-500' : 'text-red-500'],
          ].map(([label, value, color]) => (
            <div key={label as string} className="glass-panel p-4 rounded-xl border border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">{label}</span>
              <p className={`text-lg font-mono font-bold mt-1 ${color}`}>{fmt(value as number)}</p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form onSubmit={save} className="glass-panel p-5 rounded-2xl border border-border/50 grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-xs font-bold text-muted-foreground uppercase">Name
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={input} placeholder="IndusInd EMI" />
          </label>
          <label className="text-xs font-bold text-muted-foreground uppercase">Group
            <select value={form.group} onChange={e => setForm({ ...form, group: e.target.value as Group })} className={input}>
              {GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-muted-foreground uppercase">Category
            <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={input} placeholder="Loan EMI, Utilities…" />
          </label>
          <label className="text-xs font-bold text-muted-foreground uppercase">Amount comes from
            <select value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} className={input}>
              <option value="">Fixed amount below</option>
              {loans.map(l => <option key={l.id} value={`loan:${l.id}`}>Loan EMI: {l.lenderName}</option>)}
              {chits.map(c => <option key={c.id} value={`chit:${c.id}`}>Chit unpaid cycle: {c.organizerName} ({c.memberName})</option>)}
            </select>
          </label>
          {!linked && (
            <>
              <label className="text-xs font-bold text-muted-foreground uppercase">Amount {form.frequency === 'DAILY' ? '(per day)' : ''}
                <input required type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={input} />
              </label>
              <label className="text-xs font-bold text-muted-foreground uppercase">Frequency
                <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value as Frequency })} className={input}>
                  <option value="MONTHLY">Monthly</option>
                  <option value="DAILY">Daily (rate × days in month)</option>
                  <option value="EVERY_N_MONTHS">Every N months</option>
                </select>
              </label>
            </>
          )}
          {!linked && form.frequency === 'EVERY_N_MONTHS' && (
            <label className="text-xs font-bold text-muted-foreground uppercase">Every how many months
              <input required type="number" min="1" value={form.intervalMonths} onChange={e => setForm({ ...form, intervalMonths: e.target.value })} className={input} />
            </label>
          )}
          <label className="text-xs font-bold text-muted-foreground uppercase">Due day
            <input type="number" min="1" max="31" value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} className={input} />
          </label>
          <label className="text-xs font-bold text-muted-foreground uppercase">Start date {form.frequency === 'EVERY_N_MONTHS' && !linked ? '(first due month)' : '(optional)'}
            <input type="date" required={form.frequency === 'EVERY_N_MONTHS' && !linked} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className={input} />
          </label>
          <label className="text-xs font-bold text-muted-foreground uppercase">End date (optional)
            <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className={input} />
          </label>
          <label className="text-xs font-bold text-muted-foreground uppercase md:col-span-2">Notes
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={input} />
          </label>
          <div className="flex items-end">
            <button type="submit" className="w-full px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-90">
              {editingId ? 'Save changes' : 'Add commitment'}
            </button>
          </div>
        </form>
      )}

      {plan && GROUPS.map(g => {
        const lines = plan.lines.filter(l => l.group === g.key);
        if (lines.length === 0) return null;
        return (
          <div key={g.key} className="glass-panel rounded-2xl border border-border/50 overflow-x-auto">
            <div className="px-5 py-3 border-b border-border/50 flex justify-between">
              <div>
                <h3 className="font-bold text-foreground">{g.label}</h3>
                <p className="text-xs text-muted-foreground">{g.hint}</p>
              </div>
              <span className="font-mono font-bold">{fmt(lines.reduce((s, l) => s + l.amount, 0))}</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {lines.map(l => (
                  <tr key={l.id} className={`border-b border-border/30 ${l.active ? '' : 'opacity-50'}`}>
                    <td className="px-5 py-2 font-medium">{l.name}{!l.active && <span className="ml-2 text-[10px] uppercase text-amber-500 font-bold">Paused</span>}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{l.source}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{l.dueDay ? `Due ${l.dueDay}` : ''}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(l.amount)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button onClick={() => toggle(l.id)} className="p-1.5 rounded hover:bg-secondary" aria-label={l.active ? `Pause ${l.name}` : `Resume ${l.name}`} title={l.active ? 'Pause' : 'Resume'}>
                        {l.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button onClick={() => startEdit(l.id)} className="p-1.5 rounded hover:bg-secondary" aria-label={`Edit ${l.name}`} title="Edit"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(l.id, l.name)} className="p-1.5 rounded hover:bg-secondary text-red-500" aria-label={`Delete ${l.name}`} title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {plan && plan.lines.length === 0 && !showForm && (
        <p className="text-center text-muted-foreground py-12">No commitments yet. Add your salary, EMIs, chits and regular bills to see this month's headroom.</p>
      )}
    </div>
  );
}

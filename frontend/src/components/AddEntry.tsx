import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import { apiClient } from '../api/client';
import { useToastStore } from '../store/toastStore';
import { MONEY_IN, MONEY_OUT } from '../lib/simpleMoney';
import { PrimaryAction, SecondaryAction } from './ui/LiquidControls';

/**
 * Sprint 9: one way to add any entry. The user answers one plain question — money in, money out, or moving my own
 * money — and the form posts the right ledger entry (D-03) with its links; no debit/credit or "made against" choices.
 */
type Choice = 'in' | 'out' | 'move';
interface Named { id: string; [k: string]: unknown }

const CHOICES: { value: Choice; label: string; hint: string; Icon: typeof ArrowDownLeft }[] = [
  { value: 'in', label: 'Money in', hint: 'You earned or received money', Icon: ArrowDownLeft },
  { value: 'out', label: 'Money out', hint: 'You spent it — it is gone', Icon: ArrowUpRight },
  { value: 'move', label: 'Move my money', hint: 'Between your own accounts, savings or debts', Icon: ArrowLeftRight },
];

/** Where a move can go, and the ledger entry each one makes. */
const MOVE_TARGETS: Record<string, { madeAgainst: string; link: string; category: string }> = {
  deposit: { madeAgainst: 'RECURRING_DEPOSIT', link: 'linkedDeposit', category: 'Investment' },
  investment: { madeAgainst: 'SIP_INVESTMENT', link: 'linkedInvestment', category: 'Investment' },
  loan: { madeAgainst: 'LOAN_EMI', link: 'linkedLoan', category: 'Loan EMI' },
  card: { madeAgainst: 'CREDIT_CARD', link: 'linkedCreditCard', category: 'Credit Card Bill' },
  chit: { madeAgainst: 'CHIT_INSTALLMENT', link: 'linkedChitFund', category: 'Chit Fund Installment' },
  udhaar: { madeAgainst: 'PEER_LENDING', link: 'linkedPeerLending', category: 'Peer Lending (Udhaar)' },
};

const last4 = (n: unknown) => (typeof n === 'string' && n.length >= 4 ? ` ····${n.slice(-4)}` : '');
const accountName = (a: Named) => `${a.bankName ?? 'Account'}${last4(a.accountNumber)}`;
const todayIso = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const list = async (url: string): Promise<Named[]> => {
  try {
    const r = await apiClient(url);
    return Array.isArray(r) ? r : [];
  } catch {
    return [];
  }
};

const field = 'w-full p-2.5 rounded-lg bg-background text-foreground border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm';
const labelCls = 'block text-xs font-bold text-muted-foreground uppercase mb-1';

export default function AddEntry({ open, onClose, onSaved, initial = 'out' }: {
  open: boolean; onClose: () => void; onSaved?: () => void; initial?: Choice;
}) {
  const toast = useToastStore();
  const [choice, setChoice] = useState<Choice>(initial);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [group, setGroup] = useState('');
  const [account, setAccount] = useState('');
  const [paidFrom, setPaidFrom] = useState('');
  const [moveTo, setMoveTo] = useState('');
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [d, setD] = useState<Record<string, Named[]>>({});

  useEffect(() => {
    if (!open) return;
    const urls = { accounts: '/api/bankaccounts', cards: '/api/creditcards', deposits: '/api/deposits', investments: '/api/investments',
      loans: '/api/loans', chits: '/api/chitfunds', udhaar: '/api/peerlendings', sources: '/api/incomesources' };
    Promise.all(Object.entries(urls).map(async ([k, u]) => [k, await list(u)] as const)).then((r) => setD(Object.fromEntries(r)));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const accounts = d.accounts ?? [];
  const groups = choice === 'in' ? MONEY_IN : MONEY_OUT;
  const rds = useMemo(() => (d.deposits ?? []).filter((x) => x.type === 'RD'), [d.deposits]);

  if (!open) return null;

  const reset = () => { setAmount(''); setGroup(''); setNote(''); setSource(''); setMoveTo(''); setPaidFrom(''); setError(''); };
  const pick = (c: Choice) => { setChoice(c); setGroup(''); setError(''); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!amount || !Number.isFinite(value) || value <= 0) return setError('Enter an amount above ₹0.');
    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) return setError('Amount can have at most 2 decimals.');
    const base = { amount: value, expenseDate: date, description: note.trim() || undefined };
    const entries: Record<string, unknown>[] = [];

    if (choice === 'in') {
      if (!group) return setError('Choose what the money was.');
      if (!account) return setError('Choose the account it came into.');
      const side = group === 'Side income' && source;
      entries.push({ ...base, type: 'CREDIT', category: group, madeAgainst: side ? 'INCOME_SOURCE' : 'MANUAL_ENTRY',
        linkedAccount: { id: account }, linkedIncomeSource: side ? { id: source } : null });
    } else if (choice === 'out') {
      if (!group) return setError('Choose what it was for.');
      if (!paidFrom) return setError('Choose how you paid.');
      const [kind, id] = paidFrom.split(':');
      entries.push({ ...base, type: 'DEBIT', category: group,
        madeAgainst: kind === 'card' ? 'CREDIT_CARD' : 'MANUAL_ENTRY',
        linkedAccount: kind === 'account' ? { id } : null,
        linkedCreditCard: kind === 'card' ? { id } : null });
    } else {
      if (!account) return setError('Choose the account the money left.');
      if (!moveTo) return setError('Choose where the money went.');
      const [kind, id] = moveTo.split(':');
      if (kind === 'account') {
        entries.push({ ...base, type: 'DEBIT', category: 'Self Transfer', madeAgainst: 'MANUAL_ENTRY', linkedAccount: { id: account } });
        entries.push({ ...base, type: 'CREDIT', category: 'Self Transfer', madeAgainst: 'MANUAL_ENTRY', linkedAccount: { id } });
      } else {
        const t = MOVE_TARGETS[kind];
        entries.push({ ...base, type: 'DEBIT', category: t.category, madeAgainst: t.madeAgainst, linkedAccount: { id: account }, [t.link]: { id } });
      }
    }

    setSaving(true);
    try {
      for (const body of entries) await apiClient('/api/expenses', { method: 'POST', body: JSON.stringify(body) });
      toast.success('Entry saved', 'Your balances are updated.');
      reset();
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const opt = (items: Named[], prefix: string, name: (x: Named) => string) =>
    items.map((x) => <option key={`${prefix}${x.id}`} value={`${prefix}${x.id}`}>{name(x)}</option>);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="add-entry-title" onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 id="add-entry-title" className="text-lg font-semibold text-foreground">Add entry</h2>
        <form onSubmit={submit} className="space-y-4 mt-4" noValidate>
          <fieldset>
            <legend className={labelCls}>What happened?</legend>
            <div className="grid grid-cols-3 gap-2">
              {CHOICES.map(({ value, label, hint, Icon }) => (
                <label key={value} className={`fn-choice cursor-pointer rounded-xl border p-2.5 text-center text-xs transition-colors ${
                  choice === value ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:bg-muted/50'}`}>
                  <input type="radio" name="entry-choice" value={value} checked={choice === value} onChange={() => pick(value)}
                    className="sr-only" aria-describedby={`choice-${value}-hint`} />
                  <Icon className="h-4 w-4 mx-auto mb-1" aria-hidden="true" />
                  <span className="block font-bold text-sm text-foreground">{label}</span>
                  <span id={`choice-${value}-hint`} className="block leading-tight mt-0.5">{hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="entry-amount" className={labelCls}>Amount (₹)</label>
              <input id="entry-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={field} placeholder="0.00" autoFocus />
            </div>
            <div>
              <label htmlFor="entry-date" className={labelCls}>Date</label>
              <input id="entry-date" type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} className={field} />
            </div>
          </div>

          {choice !== 'move' && (
            <div>
              <label htmlFor="entry-group" className={labelCls}>{choice === 'in' ? 'What was it?' : 'What was it for?'}</label>
              <select id="entry-group" value={group} onChange={(e) => setGroup(e.target.value)} className={field}>
                <option value="">Choose…</option>
                {groups.map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
              </select>
              {group && <p className="text-[11px] text-muted-foreground mt-1">{groups.find((g) => g.name === group)?.examples.join(', ')}</p>}
            </div>
          )}

          {choice === 'in' && group === 'Side income' && (d.sources ?? []).length > 0 && (
            <div>
              <label htmlFor="entry-source" className={labelCls}>Which side income? (optional)</label>
              <select id="entry-source" value={source} onChange={(e) => setSource(e.target.value)} className={field}>
                <option value="">Not one of my sources</option>
                {(d.sources ?? []).map((s) => <option key={s.id} value={s.id}>{String(s.name ?? 'Source')}</option>)}
              </select>
            </div>
          )}

          {choice === 'in' && (
            <div>
              <label htmlFor="entry-account" className={labelCls}>Into which account?</label>
              <select id="entry-account" value={account} onChange={(e) => setAccount(e.target.value)} className={field}>
                <option value="">Choose…</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{accountName(a)}</option>)}
              </select>
            </div>
          )}

          {choice === 'out' && (
            <div>
              <label htmlFor="entry-paid" className={labelCls}>Paid from</label>
              <select id="entry-paid" value={paidFrom} onChange={(e) => setPaidFrom(e.target.value)} className={field}>
                <option value="">Choose…</option>
                {accounts.length > 0 && <optgroup label="Bank account">{opt(accounts, 'account:', accountName)}</optgroup>}
                {(d.cards ?? []).length > 0 && <optgroup label="Credit card">{opt(d.cards ?? [], 'card:', (c) => String(c.cardName ?? c.bankName ?? 'Card'))}</optgroup>}
              </select>
            </div>
          )}

          {choice === 'move' && (
            <>
              <div>
                <label htmlFor="entry-from" className={labelCls}>From which account?</label>
                <select id="entry-from" value={account} onChange={(e) => { setAccount(e.target.value); if (moveTo === `account:${e.target.value}`) setMoveTo(''); }} className={field}>
                  <option value="">Choose…</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{accountName(a)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="entry-to" className={labelCls}>To</label>
                <select id="entry-to" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className={field}>
                  <option value="">Choose…</option>
                  {accounts.some((a) => a.id !== account) && <optgroup label="My other accounts">{opt(accounts.filter((a) => a.id !== account), 'account:', accountName)}</optgroup>}
                  {(rds.length > 0 || (d.investments ?? []).length > 0 || (d.chits ?? []).length > 0) && (
                    <optgroup label="Savings & investments">
                      {opt(rds, 'deposit:', (x) => `RD · ${String(x.institution ?? '')}`)}
                      {opt(d.investments ?? [], 'investment:', (x) => `${String(x.name ?? 'Investment')} (SIP / top-up)`)}
                      {opt(d.chits ?? [], 'chit:', (x) => `Chit · ${String(x.organizerName ?? x.chitName ?? '')}`)}
                    </optgroup>
                  )}
                  {((d.loans ?? []).length > 0 || (d.cards ?? []).length > 0) && (
                    <optgroup label="Debts">
                      {opt(d.loans ?? [], 'loan:', (x) => `EMI · ${String(x.lenderName ?? '')} ${String(x.loanType ?? '')}`.trim())}
                      {opt(d.cards ?? [], 'card:', (x) => `Card bill · ${String(x.cardName ?? x.bankName ?? '')}`)}
                    </optgroup>
                  )}
                  {(d.udhaar ?? []).length > 0 && <optgroup label="Udhaar">{opt(d.udhaar ?? [], 'udhaar:', (x) => `Udhaar · ${String(x.personName ?? '')}`)}</optgroup>}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">Moving money is not spending — it only changes pocket.</p>
              </div>
            </>
          )}

          <div>
            <label htmlFor="entry-note" className={labelCls}>Note (optional)</label>
            <input id="entry-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className={field} placeholder="e.g. Weekly groceries" />
          </div>

          {error && <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <SecondaryAction onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors">Cancel</SecondaryAction>
            <PrimaryAction type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60">
              {saving ? 'Saving…' : 'Save entry'}
            </PrimaryAction>
          </div>
        </form>
      </div>
    </div>
  );
}

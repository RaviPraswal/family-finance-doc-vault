/**
 * Sprint 8 · S8-3: every ledger entry made into a Sukanya (or any) investment, oldest first, with a running total,
 * plus unlinked entries that look like they belong to it so they can be linked in one click.
 * Totals are exact (integer paise, lib/money).
 */
import { addP, fromPaise, toPaise } from './money';

interface Ref { id: string }
export interface LedgerEntry {
  id: string;
  expenseDate: string;
  amount: number;
  type?: string | null;
  category?: string | null;
  description?: string | null;
  madeAgainst?: string | null;
  linkedAccount?: Ref | null;
  linkedLoan?: Ref | null;
  linkedChitFund?: Ref | null;
  linkedPeerLending?: Ref | null;
  linkedInvestment?: Ref | null;
  linkedDeposit?: Ref | null;
  linkedProject?: Ref | null;
  linkedIncomeSource?: Ref | null;
  linkedCreditCard?: Ref | null;
  customFieldsData?: string | null;
}

export interface EntryRow {
  id: string;
  date: string;
  signedAmount: number;
  runningTotal: number;
  note: string;
}

const byDate = (a: LedgerEntry, b: LedgerEntry) => a.expenseDate.localeCompare(b.expenseDate) || a.id.localeCompare(b.id);
const signedP = (x: LedgerEntry) => (x.type === 'CREDIT' ? -1 : 1) * toPaise(x.amount);

/** Linked entries oldest first. A debit is money paid in; a credit (withdrawal) takes it out. */
export function ssyEntries(entries: LedgerEntry[], investmentId: string): { rows: EntryRow[]; total: number } {
  let running = 0;
  const rows = entries
    .filter((x) => x.linkedInvestment?.id === investmentId)
    .sort(byDate)
    .map((x) => {
      running = addP(running, signedP(x));
      return {
        id: x.id, date: x.expenseDate.slice(0, 10), signedAmount: fromPaise(signedP(x)),
        runningTotal: fromPaise(running), note: x.description || x.category || '',
      };
    });
  return { rows, total: fromPaise(running) };
}

const GENERIC = new Set(['sukanya', 'samriddhi', 'yojana', 'account', 'scheme', 'investment']);
const otherLink = (x: LedgerEntry) =>
  x.linkedInvestment || x.linkedLoan || x.linkedChitFund || x.linkedDeposit || x.linkedPeerLending || x.linkedProject || x.linkedIncomeSource;

/** Unlinked entries mentioning Sukanya, SSY or a name word of the investment (e.g. "Tejal"), newest first. */
export function linkCandidates(entries: LedgerEntry[], inv: { id: string; name: string }): LedgerEntry[] {
  const words = inv.name.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4 && !GENERIC.has(w));
  const pattern = new RegExp(`sukanya|\\bssy\\b${words.map((w) => `|\\b${w}\\b`).join('')}`, 'i');
  return entries
    .filter((x) => !otherLink(x) && pattern.test(`${x.description ?? ''} ${x.category ?? ''}`))
    .sort((a, b) => byDate(b, a));
}

const ref = (r?: Ref | null) => (r?.id ? { id: r.id } : null);

/** The PUT body that links an existing entry to the investment, keeping every other field as it is. */
export function linkPayload(x: LedgerEntry, investmentId: string) {
  return {
    amount: x.amount, category: x.category, expenseDate: x.expenseDate, description: x.description, type: x.type,
    madeAgainst: 'SIP_INVESTMENT',
    linkedAccount: ref(x.linkedAccount), linkedLoan: null, linkedChitFund: null, linkedPeerLending: null,
    linkedInvestment: { id: investmentId }, linkedDeposit: null, linkedProject: null, linkedIncomeSource: null,
    linkedCreditCard: ref(x.linkedCreditCard), customFieldsData: null,
  };
}

import { sumRupees } from './money';
import { chitPosition, type ChitLike, type UdhaarLike } from './netWorth';

/**
 * Sprint 9: everything in FinNest in four plain categories a first-time user can follow.
 *   Money In — what you earn · Money Out — what you spend (it is gone)
 *   Savings & Investments — what you own · Debts — what you owe
 * Moving your own money between your own places (an SIP, an FD, paying the card bill, the part of an EMI that pays the
 * loan down) is not spending: it only changes pocket. Each item lands in exactly one place.
 * Amounts are rupees; sums go through paise (lib/money).
 */

export interface Group { name: string; hint: string; examples: string[] }

export const MONEY_IN: Group[] = [
  { name: 'Salary', hint: 'Your regular pay', examples: ['Monthly pay', 'Bonus'] },
  { name: 'Side income', hint: 'Money from work on the side', examples: ['Freelance work', 'Tuition fees', 'Rent you receive'] },
  { name: 'Interest & returns', hint: 'What your savings earn', examples: ['FD interest', 'Dividends', 'Savings account interest'] },
  { name: 'Gifts & other income', hint: 'Anything else that comes in', examples: ['Cash gifts', 'Cashback', 'Prize money'] },
];

export const MONEY_OUT: Group[] = [
  { name: 'Home & bills', hint: 'Keeping the house running', examples: ['Rent', 'Electricity', 'Internet & mobile'] },
  { name: 'Food & daily needs', hint: 'Everyday buying', examples: ['Groceries', 'Eating out', 'Milk'] },
  { name: 'Transport & travel', hint: 'Getting around', examples: ['Fuel', 'Cabs', 'Holidays'] },
  { name: 'Health & insurance', hint: 'Staying well and covered', examples: ['Doctor & medicines', 'Health insurance', 'Term insurance'] },
  { name: 'Education & children', hint: 'Learning and kids', examples: ['School fees', 'Books', 'Coaching'] },
  { name: 'Shopping & fun', hint: 'Nice to have', examples: ['Clothes', 'Gadgets', 'Netflix & movies'] },
  { name: 'Family & giving', hint: 'Money for others', examples: ['Money to parents', 'Gifts you give', 'Donations'] },
];

export const OWN: Group[] = [
  { name: 'Bank & cash', hint: 'Money ready to use', examples: ['Savings accounts', 'Cash at home'] },
  { name: 'Fixed savings', hint: 'Locked for a fixed time at a fixed rate', examples: ['FD', 'RD', 'Post Office schemes'] },
  { name: 'Market investments', hint: 'Go up and down with the market', examples: ['Mutual funds & SIPs', 'Shares'] },
  { name: 'Long-term schemes', hint: 'Government savings for the long run', examples: ['PPF', 'Sukanya (SSY)', 'NPS / EPF'] },
  { name: 'Gold & property', hint: 'Things that hold value', examples: ['Gold', 'Plot or flat'] },
  { name: 'Chit funds', hint: 'Group savings — yours until you take the payout', examples: ['Monthly chit instalments', 'Kitty'] },
  { name: 'Money others owe you', hint: 'Udhaar you gave', examples: ['Loan to a friend', 'Advance to a relative'] },
];

export const OWE: Group[] = [
  { name: 'Home & vehicle loans', hint: 'Loans backed by what you bought', examples: ['Home loan', 'Car or two-wheeler loan'] },
  { name: 'Personal & education loans', hint: 'Other bank loans', examples: ['Personal loan', 'Education loan'] },
  { name: 'Credit cards', hint: 'The unpaid card balance', examples: ['Card bill due', 'Unpaid balance'] },
  { name: 'Chit instalments still to pay', hint: 'After you took the chit payout', examples: ['Remaining chit instalments', 'Kitty you already received'] },
  { name: 'Money you borrowed from people', hint: 'Udhaar you took', examples: ['Loan from a friend', 'Money from a relative'] },
];

const low = (s?: string | null) => (s ?? '').trim().toLowerCase();

/** Old and new spending category names → one of the seven Money Out groups; null = not sorted yet. */
const SPENDING_WORDS: [string, RegExp][] = [
  ['Home & bills', /home|bill|\brent|utilit|electric|water|gas|internet|wifi|broadband|mobile|recharge|maintenance|society|dth/],
  ['Food & daily needs', /food|grocer|daily|milk|vegetable|restaurant|dining|swiggy|zomato|kirana/],
  ['Transport & travel', /travel|transport|fuel|petrol|diesel|cab|taxi|uber|ola|auto|bus|train|flight|toll|parking/],
  ['Health & insurance', /health|medic|doctor|hospital|pharma|insurance|clinic|dental/],
  ['Education & children', /educat|school|college|tuition|fees|book|coaching|kids|child/],
  ['Shopping & fun', /shop|entertain|cloth|gadget|movie|netflix|subscription|fun|hobby|amazon|flipkart/],
  ['Family & giving', /famil|giving|gift|donat|charity|parent|festival|pooja|temple/],
];

export function spendingGroupOf(category?: string | null): string | null {
  const c = low(category);
  if (!c) return null;
  const exact = MONEY_OUT.find((g) => low(g.name) === c);
  if (exact) return exact.name;
  return SPENDING_WORDS.find(([, re]) => re.test(c))?.[0] ?? null;
}

export function incomeGroupOf(e: { category?: string | null; madeAgainst?: string | null }): string {
  const c = low(e.category);
  if (/salary|wage|bonus|payroll/.test(c)) return 'Salary';
  if (e.madeAgainst === 'INCOME_SOURCE' || /side|freelanc|tuition|\brent/.test(c)) return 'Side income';
  if (/interest|dividend|return|maturity/.test(c)) return 'Interest & returns';
  return 'Gifts & other income';
}

export interface EntryLike {
  type?: string; kind?: string | null; category?: string | null; madeAgainst?: string | null; amount?: number | null; expenseDate?: string;
  loanPrincipalPortion?: number | null; loanInterestPortion?: number | null;
}

const isRefund = (e: EntryLike) => /refund|reversal|return of purchase/.test(low(e.category));
const isSelfTransfer = (e: EntryLike) => /self transfer/.test(low(e.category));
const add = (m: Record<string, number>, k: string, v: number) => { m[k] = sumRupees([m[k] ?? 0, v]); };

const MOVED: Record<string, string> = { INVESTMENT: 'Into savings & investments', LOAN_PAYMENT: 'Loan payment', LENDING: 'Udhaar', TRANSFER: 'Between my own accounts' };

/** Where one entry sits, in plain words — for lists. Uses the same rules as the month summary. */
export function placeOf(e: EntryLike): { top: 'Money in' | 'Money out' | 'Moved'; group: string | null; needsSorting: boolean } {
  const credit = (e.type ?? '').toUpperCase() === 'CREDIT';
  const kind = (e.kind ?? (credit ? 'INCOME' : 'EXPENSE')).toUpperCase();
  if (credit && (isRefund(e) || kind === 'EXPENSE')) return { top: 'Money out', group: 'Refund (lowers spending)', needsSorting: false };
  if (kind === 'INCOME') return { top: 'Money in', group: incomeGroupOf(e), needsSorting: false };
  if (kind === 'EXPENSE') { const group = spendingGroupOf(e.category); return { top: 'Money out', group, needsSorting: !group }; }
  return { top: 'Moved', group: MOVED[kind] ?? 'Between my own accounts', needsSorting: false };
}

export function monthSummary(entries: EntryLike[], month: string) {
  const inGroups: Record<string, number> = {};
  const outGroups: Record<string, number> = {};
  let unsorted = 0, unsortedCount = 0, refunds = 0, loanInterest = 0, moved = 0;
  for (const e of entries) {
    if (!(e.expenseDate ?? '').startsWith(month)) continue;
    const amount = e.amount ?? 0;
    const credit = (e.type ?? '').toUpperCase() === 'CREDIT';
    const kind = (e.kind ?? (credit ? 'INCOME' : 'EXPENSE')).toUpperCase();
    if (isRefund(e) && credit) { refunds = sumRupees([refunds, amount]); continue; }
    switch (kind) {
      case 'INCOME':
        if (credit) add(inGroups, incomeGroupOf(e), amount);
        break;
      case 'EXPENSE': {
        if (credit) { refunds = sumRupees([refunds, amount]); break; }
        const g = spendingGroupOf(e.category);
        if (g) add(outGroups, g, amount);
        else { unsorted = sumRupees([unsorted, amount]); unsortedCount++; }
        break;
      }
      case 'LOAN_PAYMENT': {
        const interest = e.loanInterestPortion ?? 0;
        loanInterest = sumRupees([loanInterest, interest]);
        moved = sumRupees([moved, e.loanPrincipalPortion ?? sumRupees([amount, -interest])]);
        break;
      }
      default: // INVESTMENT, LENDING, TRANSFER: money changing pocket
        if (!credit && !isSelfTransfer(e)) moved = sumRupees([moved, amount]);
    }
  }
  const inTotal = sumRupees(Object.values(inGroups));
  const outTotal = sumRupees([...Object.values(outGroups), unsorted, -refunds]);
  return {
    moneyIn: { groups: inGroups, total: inTotal },
    moneyOut: { groups: outGroups, unsorted, refunds, total: outTotal },
    unsortedCount,
    loanInterest,
    movedToSavingsAndDebts: moved,
    left: sumRupees([inTotal, -outTotal, -loanInterest]),
  };
}

export interface InvestmentLike { type?: string; name?: string; currentValue?: number | null; investedAmount?: number | null }

export function investmentGroupOf(i: InvestmentLike): string {
  const text = low(`${i.type ?? ''} ${i.name ?? ''}`);
  if (/fixed deposit|recurring deposit|\bfd\b|\brd\b|post office|nsc|kvp/.test(text)) return 'Fixed savings';
  if (/ppf|sukanya|ssy|nps|epf|\bpf\b|pension|provident/.test(text)) return 'Long-term schemes';
  if (/gold|silver|property|real estate|land|plot|flat|house/.test(text)) return 'Gold & property';
  return 'Market investments';
}

export interface OwnInput {
  accounts: { currentBalance?: number | null }[];
  deposits: { type?: string; principalAmount?: number | null; totalDeposited?: number | null }[];
  investments: InvestmentLike[];
  chits: ChitLike[];
  udhaar: UdhaarLike[];
}

const total = (groups: Record<string, number>) => sumRupees(Object.values(groups));

export function ownedBreakdown(i: OwnInput) {
  const groups: Record<string, number> = {};
  for (const a of i.accounts) add(groups, 'Bank & cash', a.currentBalance ?? 0);
  for (const d of i.deposits) add(groups, 'Fixed savings', d.type === 'RD' ? (d.totalDeposited || d.principalAmount || 0) : (d.principalAmount ?? 0));
  for (const inv of i.investments) add(groups, investmentGroupOf(inv), inv.currentValue || inv.investedAmount || 0);
  for (const c of i.chits) { const p = chitPosition(c); if (p.asset) add(groups, 'Chit funds', p.asset); }
  for (const u of i.udhaar) if (!u.settled && (u.type ?? '').toUpperCase() !== 'TAKEN') add(groups, 'Money others owe you', Math.max(0, u.amount ?? 0));
  return { groups, total: total(groups) };
}

export interface OweInput {
  loans: { loanType?: string; outstandingAmount?: number | null }[];
  cards: { currentOutstanding?: number | null }[];
  chits: ChitLike[];
  udhaar: UdhaarLike[];
}

export function owedBreakdown(i: OweInput) {
  const groups: Record<string, number> = {};
  for (const l of i.loans) {
    const secured = /home|house|housing|car|vehicle|auto|bike|two.?wheeler|property|mortgage/.test(low(l.loanType));
    add(groups, secured ? 'Home & vehicle loans' : 'Personal & education loans', l.outstandingAmount ?? 0);
  }
  for (const c of i.cards) { const v = Math.max(0, c.currentOutstanding ?? 0); if (v) add(groups, 'Credit cards', v); }
  for (const c of i.chits) { const p = chitPosition(c); if (p.liability) add(groups, 'Chit instalments still to pay', p.liability); }
  for (const u of i.udhaar) if (!u.settled && (u.type ?? '').toUpperCase() === 'TAKEN') add(groups, 'Money you borrowed from people', Math.max(0, u.amount ?? 0));
  return { groups, total: total(groups) };
}

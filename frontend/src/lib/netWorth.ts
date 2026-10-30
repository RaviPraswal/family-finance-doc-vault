/**
 * Family net worth maths, kept separate from the page so it can be tested.
 * Amounts are rupees. Every input is optional: missing data counts as zero.
 */

export interface ChitLike {
  durationMonths?: number;
  pendingInstallments?: number;
  monthlyInstallment?: number;
  isAllotted?: boolean;
}

export interface UdhaarLike {
  type?: string; // GIVEN = you lent, TAKEN = you borrowed
  amount?: number; // still outstanding
  settled?: boolean;
}

/**
 * Before the prize: what you have paid in is an asset.
 * After the prize: the prize money is already in your bank, and the
 * installments still to pay are money you owe.
 */
export function chitPosition(c: ChitLike): { asset: number; liability: number } {
  const installment = c.monthlyInstallment || 0;
  const pending = Math.max(0, c.pendingInstallments || 0);
  if (c.isAllotted) {
    return { asset: 0, liability: pending * installment };
  }
  const paid = Math.max(0, (c.durationMonths || 0) - pending);
  return { asset: paid * installment, liability: 0 };
}

/** Money lent is owed to you (asset); money borrowed is owed by you (liability). Settled entries count as zero. */
export function udhaarPosition(list: UdhaarLike[]): { lent: number; borrowed: number } {
  let lent = 0;
  let borrowed = 0;
  for (const u of list) {
    if (u.settled) continue;
    const amt = Math.max(0, u.amount || 0);
    if ((u.type || '').toUpperCase() === 'TAKEN') borrowed += amt;
    else lent += amt;
  }
  return { lent, borrowed };
}

export interface NetWorthInput {
  bankBalance: number;
  investmentsExChits: number;
  chits: ChitLike[];
  loanOutstanding: number;
  cardOutstanding: number;
  udhaar: UdhaarLike[];
}

export function netWorthOf(i: NetWorthInput) {
  const chit = i.chits.map(chitPosition).reduce((a, b) => ({ asset: a.asset + b.asset, liability: a.liability + b.liability }), { asset: 0, liability: 0 });
  const u = udhaarPosition(i.udhaar);
  const cards = Math.max(0, i.cardOutstanding);
  const assets = i.bankBalance + i.investmentsExChits + chit.asset + u.lent;
  const liabilities = i.loanOutstanding + cards + chit.liability + u.borrowed;
  return { assets, liabilities, netWorth: assets - liabilities, chitAsset: chit.asset, chitLiability: chit.liability, lent: u.lent, borrowed: u.borrowed, cards };
}

/** Year-end projection that can go down as well as up. */
export function projectNetWorth(netWorth: number, monthlySurplus: number, months: number) {
  const change = monthlySurplus * Math.max(0, months);
  return { projected: netWorth + change, change };
}

import { formatINR, toPaise } from './money';

interface DepositLike {
  type?: string;
  principalAmount?: number | null;
  totalDeposited?: number | null;
  monthlyDepositAmount?: number | null;
}

/** Sprint 7 T5: what has gone into a deposit, in paise (RD: total deposited from the ledger; FD: principal). */
export function depositInvestedP(d: DepositLike): number {
  return d.type === 'RD' ? toPaise(d.totalDeposited || d.principalAmount) : toPaise(d.principalAmount);
}

/** RD: "₹5,000/month · ₹10,000 deposited"; FD: "₹1,00,000". */
export function depositAmountText(d: DepositLike): string {
  if (d.type !== 'RD') return formatINR(toPaise(d.principalAmount));
  const total = `${formatINR(depositInvestedP(d))} deposited`;
  return d.monthlyDepositAmount ? `${formatINR(toPaise(d.monthlyDepositAmount))}/month · ${total}` : total;
}

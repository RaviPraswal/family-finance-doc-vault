/** Dashboard alert rules kept out of the page so they can be tested (Sprint 3, S3-17). */

export interface UdhaarAlertSource {
  personName?: string;
  type?: string; // GIVEN = you lent, TAKEN = you borrowed
  amount?: number; // still outstanding
  expectedReturnDate?: string;
  settled?: boolean;
}

export interface DashboardAlert {
  type: 'OVERDUE' | 'LOW_BALANCE';
  urgency: number;
  title: string;
  message: string;
  actionLabel: string;
  actionPath: string;
}

/** Unsettled udhaar with money outstanding whose expected return date has passed. */
export function overdueUdhaar(entries: UdhaarAlertSource[], today: Date = new Date()): DashboardAlert[] {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  return entries
    .filter(p => !p.settled && (p.amount || 0) > 0 && p.expectedReturnDate)
    .filter(p => {
      const due = new Date(p.expectedReturnDate as string);
      due.setHours(0, 0, 0, 0);
      return due < start;
    })
    .map(p => {
      const due = new Date(p.expectedReturnDate as string);
      return {
        type: 'OVERDUE' as const,
        urgency: 1,
        title: `Overdue Udhaar: ${p.personName}`,
        message: `${p.type === 'TAKEN' ? 'Pay back' : 'Collect'} ₹${(p.amount || 0).toLocaleString()} - was due on ${due.toLocaleDateString()}.`,
        actionLabel: 'View Udhaar',
        actionPath: '/dashboard/peer-lending',
      };
    });
}

export interface LoanAlertSource {
  id: string;
  lenderName?: string;
  outstandingAmount?: number;
  emiAmount?: number;
  firstEmiDate?: string | null;
}
export interface LedgerAlertSource { linkedLoan?: { id?: string } | null; expenseDate?: string; type?: string }

/** A loan with money outstanding and no EMI recorded this month, after its EMI day (day 5 when unknown). */
export function overdueEmis(loans: LoanAlertSource[], entries: LedgerAlertSource[], today: Date = new Date()): DashboardAlert[] {
  const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  return loans
    .filter((l) => (l.outstandingAmount || 0) > 0)
    .filter((l) => today.getDate() > (l.firstEmiDate ? Number(l.firstEmiDate.slice(8, 10)) : 5))
    .filter((l) => !entries.some((e) => e.linkedLoan?.id === l.id && e.type !== 'CREDIT' && (e.expenseDate || '').startsWith(ym)))
    .map((l) => ({
      type: 'OVERDUE' as const,
      urgency: 1,
      title: `Overdue EMI: ${l.lenderName}`,
      message: `₹${(l.emiAmount ?? 0).toLocaleString('en-IN')} not recorded yet this month.`,
      actionLabel: 'View loan',
      actionPath: '/dashboard/loans',
    }));
}

/** Bank accounts below ₹5,000. */
export function lowBalances(accounts: { bankName?: string; currentBalance?: number }[], threshold = 5000): DashboardAlert[] {
  return accounts
    .filter((a) => (a.currentBalance ?? 0) < threshold)
    .map((a) => ({
      type: 'LOW_BALANCE' as const,
      urgency: 3,
      title: `Low balance: ${a.bankName}`,
      message: `₹${(a.currentBalance ?? 0).toLocaleString('en-IN')} left (below ₹${threshold.toLocaleString('en-IN')}).`,
      actionLabel: 'Bank accounts',
      actionPath: '/dashboard/bank-accounts',
    }));
}

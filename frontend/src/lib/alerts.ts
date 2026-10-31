/** Dashboard alert rules kept out of the page so they can be tested (Sprint 3, S3-17). */

export interface UdhaarAlertSource {
  personName?: string;
  type?: string; // GIVEN = you lent, TAKEN = you borrowed
  amount?: number; // still outstanding
  expectedReturnDate?: string;
  settled?: boolean;
}

export interface DashboardAlert {
  type: 'OVERDUE';
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
        actionPath: '/peer-lending',
      };
    });
}

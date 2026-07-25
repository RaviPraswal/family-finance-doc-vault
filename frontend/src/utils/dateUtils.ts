/**
 * Classifies a date against today's date for urgency and overdue indicators.
 * Green/neutral: > 30 days away OR already settled/paid
 * Yellow/amber:  within next 7-30 days
 * Red:           overdue (past due date and unsettled) OR within next 7 days
 */
export function getDateUrgency(dateStr: string | null | undefined, settled: boolean): 'red' | 'yellow' | 'green' {
  if (settled || !dateStr) return 'green';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(dateStr);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    // Overdue
    return 'red';
  } else if (diffDays <= 7) {
    // Due within 7 days
    return 'red';
  } else if (diffDays <= 30) {
    // Due within 30 days
    return 'yellow';
  } else {
    return 'green';
  }
}

/**
 * Returns a human-friendly description of remaining days or overdue status.
 */
export function getDateUrgencyLabel(dateStr: string | null | undefined, settled: boolean): string {
  if (settled) return 'Settled';
  if (!dateStr) return 'No Date';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(dateStr);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`;
  } else if (diffDays === 0) {
    return 'Due Today';
  } else if (diffDays === 1) {
    return 'Due Tomorrow';
  } else {
    return `Due in ${diffDays} days`;
  }
}

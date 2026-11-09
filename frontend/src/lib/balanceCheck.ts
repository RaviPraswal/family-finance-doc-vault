/** Sprint 8 · S8-1: daily bank balance check — last-checked labels and the exact difference preview. */
import { toPaise } from './money';

const day = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d); };

export function checkStatus(lastCheckDate: string | null | undefined, today: string): { checkedToday: boolean; label: string } {
  if (!lastCheckDate) return { checkedToday: false, label: 'Never checked' };
  const days = Math.round((day(today) - day(lastCheckDate)) / 86400000);
  if (days <= 0) return { checkedToday: true, label: 'Checked today' };
  return { checkedToday: false, label: days === 1 ? 'Last checked yesterday' : `Last checked ${days} days ago` };
}

/** The entered amount with commas and spaces removed, or null if it is not a number. */
export function cleanAmount(raw: string): string | null {
  const s = raw.replace(/[,\s₹]/g, '');
  return /^-?\d+(\.\d+)?$/.test(s) ? s : null;
}

/** What the bank shows minus the app balance, in paise; null when nothing valid is entered. */
export function differenceP(raw: string, appBalance: number): number | null {
  const s = cleanAmount(raw);
  return s === null ? null : toPaise(s) - toPaise(appBalance);
}

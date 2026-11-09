import { formatINR, sumRupees, toPaise } from './money';

/**
 * Sprint 8 S8-5: udhaar (informal lending) per person and in total, exact to the paisa.
 * "amount" is what is still outstanding; principalAmount is what was lent or borrowed; repaidAmount what came back.
 */
export interface UdhaarEntry {
  type?: string; // GIVEN = I lent, TAKEN = I borrowed
  personName?: string;
  amount?: number | null;
  principalAmount?: number | null;
  repaidAmount?: number | null;
  settled?: boolean;
}

export interface PersonSummary {
  name: string;
  given: number;
  taken: number;
  receivedBack: number;
  repaidByMe: number;
  owesMe: number;
  iOwe: number;
  net: number;
  label: string;
}

const outstanding = (e: UdhaarEntry) => (e.settled ? 0 : Math.max(0, e.amount || 0));
const original = (e: UdhaarEntry) => e.principalAmount ?? sumRupees([e.amount, e.repaidAmount]);
const isTaken = (e: UdhaarEntry) => (e.type || '').toUpperCase() === 'TAKEN';

export function udhaarByPerson(list: UdhaarEntry[]): PersonSummary[] {
  const groups = new Map<string, { name: string; entries: UdhaarEntry[] }>();
  for (const e of list) {
    const name = (e.personName || 'Unknown').trim();
    const key = name.toLowerCase();
    if (!groups.has(key)) groups.set(key, { name, entries: [] });
    groups.get(key)!.entries.push(e);
  }
  const people = [...groups.values()].map(({ name, entries }) => {
    const lent = entries.filter((e) => !isTaken(e));
    const borrowed = entries.filter(isTaken);
    const owesMe = sumRupees(lent.map(outstanding));
    const iOwe = sumRupees(borrowed.map(outstanding));
    const net = sumRupees([owesMe, -iOwe]);
    const label = net > 0 ? `${name} owes you ${formatINR(toPaise(net))}`
      : net < 0 ? `You owe ${name} ${formatINR(toPaise(-net))}`
      : `Settled with ${name}`;
    return {
      name,
      given: sumRupees(lent.map(original)),
      taken: sumRupees(borrowed.map(original)),
      receivedBack: sumRupees(lent.map((e) => e.repaidAmount)),
      repaidByMe: sumRupees(borrowed.map((e) => e.repaidAmount)),
      owesMe, iOwe, net, label,
    };
  });
  const rank = (p: PersonSummary) => (p.net > 0 ? 0 : p.net < 0 ? 1 : 2);
  return people.sort((a, b) => rank(a) - rank(b) || Math.abs(b.net) - Math.abs(a.net) || a.name.localeCompare(b.name));
}

export function udhaarTotals(list: UdhaarEntry[]) {
  const owedToMe = sumRupees(list.filter((e) => !isTaken(e)).map(outstanding));
  const iOwe = sumRupees(list.filter(isTaken).map(outstanding));
  return { owedToMe, iOwe, net: sumRupees([owedToMe, -iOwe]), receivedBack: sumRupees(list.filter((e) => !isTaken(e)).map((e) => e.repaidAmount)) };
}

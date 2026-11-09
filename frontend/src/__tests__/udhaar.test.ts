import { describe, it, expect } from 'vitest';
import { udhaarByPerson, udhaarTotals } from '../lib/udhaar';

// Sprint 8 S8-5: who owes me and whom I owe, per person, exact to the paisa.
const list = [
  { type: 'GIVEN', personName: 'Lokesh', amount: 4000, principalAmount: 4000, repaidAmount: 0, settled: false },
  { type: 'GIVEN', personName: 'lokesh ', amount: 20000, principalAmount: 24000, repaidAmount: 4000, settled: false },
  { type: 'TAKEN', personName: 'Pradeep', amount: 120000.01, principalAmount: 120000.01, repaidAmount: 0, settled: false },
  { type: 'GIVEN', personName: 'Mukesh', amount: 0, principalAmount: 10000, repaidAmount: 10000, settled: true },
];

describe('udhaar by person', () => {
  const people = udhaarByPerson(list);

  it('groups one person across spellings and nets what they owe', () => {
    expect(people.find((p) => p.name === 'Lokesh')).toMatchObject({ given: 28000, receivedBack: 4000, owesMe: 24000, iOwe: 0, net: 24000, label: 'Lokesh owes you ₹24,000' });
  });

  it('shows what I owe without stray paise in the label', () => {
    expect(people.find((p) => p.name === 'Pradeep')).toMatchObject({ taken: 120000.01, iOwe: 120000.01, net: -120000.01, label: 'You owe Pradeep ₹1,20,000' });
  });

  it('a fully repaid person is settled', () => {
    expect(people.find((p) => p.name === 'Mukesh')).toMatchObject({ net: 0, label: 'Settled with Mukesh', receivedBack: 10000 });
  });

  it('lists people who owe me first, biggest first, then whom I owe', () => {
    expect(people.map((p) => p.name)).toEqual(['Lokesh', 'Pradeep', 'Mukesh']);
  });
});

describe('udhaar totals', () => {
  it('counts money received back, not the outstanding of settled entries', () => {
    expect(udhaarTotals(list)).toEqual({ owedToMe: 24000, iOwe: 120000.01, net: -96000.01, receivedBack: 14000 });
  });
});

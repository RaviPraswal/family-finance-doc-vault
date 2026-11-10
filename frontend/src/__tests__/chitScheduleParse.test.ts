import { describe, it, expect } from 'vitest';
import { parseChitSchedule } from '../lib/chitSchedule';

// Sprint 8 hardening: one chit with an odd or broken schedule must not blank the whole Chit Funds page.
const fallback = [
  { srNo: 1, monthCycle: 'Cycle 1', calendarMonth: 'Apr', calendarYear: 2026, actualAmount: 5000, chitAmountAllocated: 45000, status: 'Open / Pending' as const },
  { srNo: 2, monthCycle: 'Cycle 2', calendarMonth: 'May', calendarYear: 2026, actualAmount: 5000, chitAmountAllocated: 46000, status: 'Open / Pending' as const },
];

describe('parseChitSchedule', () => {
  it('keeps a well-formed schedule as it is', () => {
    expect(parseChitSchedule(JSON.stringify(fallback), fallback)).toEqual(fallback);
  });
  it('fills missing fields from the generated schedule and coerces numbers', () => {
    const rows = parseChitSchedule(JSON.stringify([{ srNo: 1, actualDue: '5100', status: 'Paid & Closed' }, { status: 'weird' }]), fallback);
    expect(rows[0]).toMatchObject({ calendarMonth: 'Apr', actualAmount: 5100, chitAmountAllocated: 45000, status: 'Paid & Closed' });
    expect(rows[1]).toMatchObject({ srNo: 2, calendarMonth: 'May', actualAmount: 5000, status: 'Open / Pending' });
  });
  it('falls back to the generated schedule for broken JSON or a non-list', () => {
    expect(parseChitSchedule('{oops', fallback)).toEqual(fallback);
    expect(parseChitSchedule('{"a":1}', fallback)).toEqual(fallback);
    expect(parseChitSchedule(null, fallback)).toEqual(fallback);
  });
});

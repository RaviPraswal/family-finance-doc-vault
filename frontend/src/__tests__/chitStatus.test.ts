import { describe, it, expect } from 'vitest';
import { chitCounts, matchesChitFilter, chitStatusLabel } from '../lib/chitStatus';

// Sprint 8 fix: a chit is active until it is marked closed; allotment is a separate fact.
const c = (isAllotted: boolean, isClosed?: boolean) => ({ isAllotted, isClosed });

describe('chit status', () => {
  it('counts active vs closed, regardless of allotment', () => {
    expect(chitCounts([c(true), c(true), c(false), c(true, true)])).toEqual({ active: 3, closed: 1, allotted: 2, awaiting: 1 });
  });
  it('filters by active, closed, allotted and awaiting bidding', () => {
    const list = [c(true), c(false), c(true, true)];
    expect(list.filter((x) => matchesChitFilter(x, 'ACTIVE'))).toHaveLength(2);
    expect(list.filter((x) => matchesChitFilter(x, 'CLOSED'))).toHaveLength(1);
    expect(list.filter((x) => matchesChitFilter(x, 'ALLOTTED'))).toHaveLength(1);
    expect(list.filter((x) => matchesChitFilter(x, 'AWAITING'))).toHaveLength(1);
    expect(list.filter((x) => matchesChitFilter(x, 'ALL'))).toHaveLength(3);
  });
  it('labels the status in plain words', () => {
    expect(chitStatusLabel({ ...c(true, true), closedOn: '2026-11-09' })).toBe('Closed on 9 Nov 2026');
    expect(chitStatusLabel(c(true, true))).toBe('Closed');
    expect(chitStatusLabel(c(true))).toBe('Active · allotted');
    expect(chitStatusLabel(c(false))).toBe('Active · awaiting bidding');
  });
});

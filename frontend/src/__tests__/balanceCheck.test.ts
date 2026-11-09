import { describe, it, expect } from 'vitest';
import { checkStatus, differenceP } from '../lib/balanceCheck';

// Sprint 8 · S8-1: daily bank balance check helpers.
describe('checkStatus', () => {
  it('says when an account was last checked and flags ones not checked today', () => {
    expect(checkStatus('2026-11-09', '2026-11-09')).toEqual({ checkedToday: true, label: 'Checked today' });
    expect(checkStatus('2026-11-08', '2026-11-09')).toEqual({ checkedToday: false, label: 'Last checked yesterday' });
    expect(checkStatus('2026-11-03', '2026-11-09')).toEqual({ checkedToday: false, label: 'Last checked 6 days ago' });
    expect(checkStatus(null, '2026-11-09')).toEqual({ checkedToday: false, label: 'Never checked' });
  });
});

describe('differenceP', () => {
  it('is what the bank shows minus the app balance, exactly in paise', () => {
    expect(differenceP('5800.50', 6000)).toBe(-19950);
    expect(differenceP('1,250', 1000)).toBe(25000);
    expect(differenceP('0.3', 0.1)).toBe(20);
  });
  it('is null when nothing (or nonsense) is entered', () => {
    expect(differenceP('', 6000)).toBeNull();
    expect(differenceP('abc', 6000)).toBeNull();
  });
});

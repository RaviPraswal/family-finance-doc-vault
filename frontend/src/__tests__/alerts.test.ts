import { describe, it, expect } from 'vitest';
import { overdueUdhaar } from '../lib/alerts';

// Sprint 3, S3-17 (BR-UDH-06): the overdue udhaar alert reads expectedReturnDate and skips settled entries.
describe('overdue udhaar alerts', () => {
  const today = new Date('2026-10-31');

  it('flags unsettled udhaar past its expected return date', () => {
    const alerts = overdueUdhaar([
      { personName: 'Amit', type: 'GIVEN', amount: 5000, expectedReturnDate: '2026-10-01', settled: false },
      { personName: 'Ravi', type: 'TAKEN', amount: 2000, expectedReturnDate: '2026-11-15', settled: false },
      { personName: 'Neha', type: 'GIVEN', amount: 3000, expectedReturnDate: '2026-09-01', settled: true },
      { personName: 'Zero', type: 'GIVEN', amount: 0, expectedReturnDate: '2026-09-01', settled: false },
    ], today);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].title).toBe('Overdue Udhaar: Amit');
    expect(alerts[0].message).toMatch(/^Collect/);
  });
});

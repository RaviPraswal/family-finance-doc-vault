import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { dotLevels, weeklyNet } from '../lib/dotMatrix';
import DotMatrix from '../components/DotMatrix';

// Sprint 4 (S4-04, S4-05): the dot-matrix mini charts on the cockpit cards.
describe('dot matrix', () => {
  it('scales values to 0..5 rows, largest value fills the column', () => {
    expect(dotLevels([0, 50, 100, 25])).toEqual([0, 3, 5, 1]);
    expect(dotLevels([0, 0])).toEqual([0, 0]);
  });

  it('treats negative values as their size so a deficit still shows', () => {
    expect(dotLevels([-100, 50])).toEqual([5, 3]);
  });

  it('sums money in minus money out per week, leaving transfers out', () => {
    const today = new Date('2026-10-31');
    const weeks = weeklyNet([
      { expenseDate: '2026-10-30', type: 'CREDIT', amount: 1000, kind: 'INCOME' },
      { expenseDate: '2026-10-29', type: 'DEBIT', amount: 300, kind: 'EXPENSE' },
      { expenseDate: '2026-10-28', type: 'DEBIT', amount: 5000, kind: 'TRANSFER' },
      { expenseDate: '2026-10-20', type: 'DEBIT', amount: 200, kind: 'EXPENSE' },
      { expenseDate: '2026-01-01', type: 'CREDIT', amount: 9999, kind: 'INCOME' },
    ], 3, today);
    expect(weeks).toEqual([0, -200, 700]);
  });

  it('renders rows x columns dots with a readable label', () => {
    render(<DotMatrix levels={[1, 5, 0]} color="#2F4BFF" label="Net worth trend" />);
    const chart = screen.getByRole('img', { name: 'Net worth trend' });
    expect(chart.querySelectorAll('[data-dot]')).toHaveLength(15);
    expect(chart.querySelectorAll('[data-on="true"]')).toHaveLength(6);
  });
});

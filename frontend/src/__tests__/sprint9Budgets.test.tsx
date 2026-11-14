import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const apiClient = vi.fn();
vi.mock('../api/client', () => ({ apiClient: (...args: unknown[]) => apiClient(...args) }));
const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
vi.mock('../store/toastStore', () => ({ useToastStore: () => toast }));
vi.mock('../store/confirmStore', () => ({ useConfirmStore: () => ({ show: vi.fn() }) }));

import Budgets from '../pages/Budgets';

const row = (category: string, spentAmount = 0, limitAmount = 0) => ({ id: null, category, limitAmount, rolloverAmount: 0, spentAmount,
  percentage: 0, rollover: false, emailAlert: false, daysLeft: 10, alert: null });

beforeEach(() => {
  vi.clearAllMocks();
  apiClient.mockImplementation((url: string) => Promise.resolve(url.startsWith('/api/budgets/summary')
    // the server sends the groups in no particular order
    ? [row('Not sorted yet', 300), row('Shopping & fun'), row('Home & bills', 12000, 20000), row('Family & giving'), row('Food & daily needs', 4000),
      row('Transport & travel'), row('Education & children'), row('Health & insurance')]
    : { obligations: [], totalOutgoing: 0, breakdown: {} }));
});

// Sprint 9 stage 2: spending limits follow the seven Money Out groups.
describe('Spending limits', () => {
  it('lists the seven groups in the usual order, with examples, and unsorted spending last', async () => {
    render(<Budgets />);
    await screen.findByRole('heading', { name: 'Home & bills' });
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Home & bills', 'Food & daily needs',
      'Transport & travel', 'Health & insurance', 'Education & children', 'Shopping & fun', 'Family & giving', 'Not sorted yet']);
    expect(screen.getByText('Rent, Electricity, Internet & mobile')).toBeInTheDocument();
    expect(screen.getByText(/sort them in all entries/i)).toBeInTheDocument();
  });
});

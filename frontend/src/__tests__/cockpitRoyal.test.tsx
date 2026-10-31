import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const apiClient = vi.fn();
vi.mock('../api/client', () => ({ apiClient: (...args: unknown[]) => apiClient(...args) }));

import PortfolioOverview from '../pages/PortfolioOverview';

const recent = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);

const data: Record<string, unknown> = {
  '/api/bankaccounts': [{ id: 'a1', userId: 'u1', bankName: 'SBI', currentBalance: 210000 }],
  '/api/loans': [{ id: 'l1', userId: 'u1', lenderName: 'HDFC home loan', outstandingAmount: 1496544, emiAmount: 16581 }],
  '/api/investments': [{ id: 'i1', userId: 'u2', name: 'Mutual funds', type: 'Mutual Fund', currentValue: 300000 }],
  '/api/expenses': [
    { id: 'e1', expenseDate: recent(2), type: 'CREDIT', amount: 98000, kind: 'INCOME', category: 'Salary' },
    { id: 'e2', expenseDate: recent(9), type: 'DEBIT', amount: 12000, kind: 'EXPENSE', category: 'Food' },
  ],
  '/api/family-members': [{ id: 'u1', name: 'Ravi Kumar' }, { id: 'u2', name: 'Priya' }],
  '/api/family-members/profile': { familyName: 'Kumar Family' },
};

// Sprint 4 (S4-04 to S4-06): the cockpit shows the family money map and dot-matrix trends from real data.
describe('Cockpit: money map and dot charts', () => {
  beforeEach(() => {
    apiClient.mockReset();
    apiClient.mockImplementation((url: string) => Promise.resolve(data[url] ?? []));
  });

  const renderCockpit = () => render(<MemoryRouter><PortfolioOverview /></MemoryRouter>);

  it('draws who holds what: family, members and their holdings', async () => {
    renderCockpit();
    const map = await screen.findByRole('img', { name: /who holds what/i });
    expect(within(map).getByText('KF')).toBeInTheDocument();
    expect(within(map).getByText('Ravi')).toBeInTheDocument();
    expect(within(map).getByText('Priya')).toBeInTheDocument();
    expect(within(map).getByText('SBI')).toBeInTheDocument();
    expect(within(map).getByText('HDFC home loan')).toBeInTheDocument();
    expect(within(map).getByText('Mutual funds')).toBeInTheDocument();
  });

  it('shows the weekly money trend as a dot chart on the net worth card', async () => {
    renderCockpit();
    await waitFor(() => expect(screen.getByRole('img', { name: /weekly money in minus out/i })).toBeInTheDocument());
    const chart = screen.getByRole('img', { name: /weekly money in minus out/i });
    expect(chart.querySelectorAll('[data-on="true"]').length).toBeGreaterThan(0);
  });

  it('marks the net worth card as a gradient hero for the Royal skin', async () => {
    renderCockpit();
    const label = await screen.findByText(/total net worth/i);
    expect(label.closest('.rg-hero')).not.toBeNull();
  });
});

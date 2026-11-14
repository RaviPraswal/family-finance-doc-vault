import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const apiClient = vi.fn();
vi.mock('../api/client', () => ({ apiClient: (...args: unknown[]) => apiClient(...args) }));
const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
vi.mock('../store/toastStore', () => ({ useToastStore: () => toast }));

import Home from '../pages/Home';

const month = new Date().toISOString().slice(0, 7);
const data: Record<string, unknown[]> = {
  '/api/expenses': [
    { id: 'e1', type: 'CREDIT', kind: 'INCOME', category: 'Salary', amount: 50000, expenseDate: `${month}-01` },
    { id: 'e2', type: 'DEBIT', kind: 'EXPENSE', category: 'Rent', amount: 12000, expenseDate: `${month}-02` },
    { id: 'e3', type: 'DEBIT', kind: 'EXPENSE', category: 'Misc', amount: 300, expenseDate: `${month}-03` },
    { id: 'e4', type: 'DEBIT', kind: 'INVESTMENT', category: 'Investment', amount: 5000, expenseDate: `${month}-04` },
  ],
  '/api/bankaccounts': [{ id: 'a1', bankName: 'Test Bank', currentBalance: 20000 }],
  '/api/deposits': [{ id: 'd1', type: 'FD', principalAmount: 100000 }],
  '/api/investments': [],
  '/api/chitfunds': [],
  '/api/peerlendings': [],
  '/api/loans': [{ id: 'l1', loanType: 'Personal Loan', outstandingAmount: 30000 }],
  '/api/creditcards': [{ id: 'c1', currentOutstanding: 2000 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  apiClient.mockImplementation((url: string) => Promise.resolve(data[url] ?? []));
});

const home = () => render(<MemoryRouter><Home /></MemoryRouter>);
const card = async (name: RegExp) => screen.findByRole('region', { name });

// Sprint 9: Home shows everything as four plain cards.
describe('Home', () => {
  it('shows the four categories with this month\'s numbers', async () => {
    home();
    expect(within(await card(/^money in/i)).getAllByText('₹50,000')).toHaveLength(2); // total and Salary
    const out = await card(/^money out/i);
    expect(within(out).getByText('₹12,300')).toBeInTheDocument();
    expect(within(out).getByText('Home & bills')).toBeInTheDocument();
    expect(within(await card(/^savings & investments/i)).getByText('₹1,20,000')).toBeInTheDocument();
    expect(within(await card(/^debts/i)).getByText('₹32,000')).toBeInTheDocument();
  });

  it('shows what you are worth and what moved (not spending)', async () => {
    home();
    expect(await screen.findByText('₹88,000')).toBeInTheDocument(); // 1,20,000 − 32,000
    expect(screen.getByText(/moved into savings & debts/i).closest('p')).toHaveTextContent('₹5,000');
  });

  it('points to entries that are not sorted yet', async () => {
    home();
    const link = await screen.findByRole('link', { name: /1 entry not sorted yet/i });
    expect(link).toHaveAttribute('href', '/dashboard/expenses');
  });

  it('opens Add entry', async () => {
    home();
    await userEvent.click(await screen.findByRole('button', { name: /add entry/i }));
    expect(screen.getByRole('dialog', { name: /add entry/i })).toBeInTheDocument();
  });

  it('can look at the month before', async () => {
    home();
    await card(/^money in/i);
    await userEvent.click(screen.getByRole('button', { name: /previous month/i }));
    expect(within(await card(/^money in/i)).getByText('₹0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next month/i })).toBeEnabled();
  });
});

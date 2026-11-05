import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const apiClient = vi.fn();
vi.mock('../api/client', () => ({ apiClient: (...args: unknown[]) => apiClient(...args) }));

import PortfolioOverview from '../pages/PortfolioOverview';
import Loans from '../pages/Loans';
import Investments from '../pages/Investments';
import { useThemeStore } from '../store/themeStore';

const monthsAgo = (n: number, day = 5) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  d.setDate(day);
  return d.toISOString().slice(0, 10);
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const loan = {
  id: 'l1', lenderName: 'Test Bank', loanType: 'Personal', borrowerName: 'A', principalAmount: 500000,
  outstandingAmount: 480000, emiAmount: 10624, interestRate: 10, interestMethod: 'MONTHLY',
  tenureMonths: 60, firstEmiDate: monthsAgo(4), paidInstallmentsOpening: 3,
};
const chitSchedule = Array.from({ length: 20 }, (_, i) => {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 2 + i);
  return { srNo: i + 1, monthCycle: `Month ${i + 1}`, calendarMonth: MONTHS[d.getMonth()], calendarYear: d.getFullYear(),
    actualAmount: 10000, chitAmountAllocated: 0, status: i < 2 ? 'Paid & Closed' : 'Open / Pending' };
});

let data: Record<string, unknown>;
beforeEach(() => {
  data = {
    '/api/documents': [],
    '/api/notifications/unread': [],
    '/api/bankaccounts': [{ id: 'a1', bankName: 'Low Bank', currentBalance: 1000 }],
    '/api/loans': [loan],
    '/api/peerlendings': [{ id: 'p1', type: 'GIVEN', amount: 5000, personName: 'Amit', expectedReturnDate: '2026-01-01', settled: false }],
    '/api/expenses': [],
    '/api/chitfunds': [{ id: 'c1', organizerName: 'Test Chit', memberName: 'A', totalValue: 200000, monthlyInstallment: 10000,
      durationMonths: 20, pendingInstallments: 18, startDate: monthsAgo(2, 1), isAllotted: false, allottedAmount: null,
      linkedAccount: null, paymentSchedule: JSON.stringify(chitSchedule) }],
  };
  apiClient.mockReset();
  apiClient.mockImplementation((url: string, opts?: { method?: string }) => {
    if (opts?.method && opts.method !== 'GET') return Promise.resolve({});
    const path = url.split('?')[0];
    return Promise.resolve(data[path] ?? []);
  });
  useThemeStore.setState({ skin: 'classic' });
});

const at = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

// Sprint 6 (S6-01): a loan without statement details still shows its remaining EMIs.
describe('Loans without statement details', () => {
  it('shows a schedule projected from today\'s outstanding balance', async () => {
    data['/api/loans'] = [{ ...loan, outstandingAmount: 100000, emiAmount: 10000, interestRate: 12, tenureMonths: null, firstEmiDate: null }];
    at(<Loans />);
    const table = await screen.findByRole('table', { name: /emi schedule/i });
    expect(within(table).getAllByRole('row')).toHaveLength(12); // header + 11 EMIs
    expect(screen.getByText(/projected from today/i)).toBeInTheDocument();
  });
});

// Sprint 6 (S6-03): the cockpit shows side income actually received.
describe('Side income on the cockpit', () => {
  it('shows the latest amount received, not the stale expected amount', async () => {
    data['/api/incomesources'] = [{ id: 's1', sourceName: 'Dinesh', amount: 30000, frequency: 'Monthly' }];
    data['/api/expenses'] = [{ id: 'e1', type: 'CREDIT', amount: 15000, expenseDate: monthsAgo(1, 9), category: 'Side Income', linkedIncomeSource: { id: 's1' } }];
    at(<PortfolioOverview />);
    const name = await screen.findByText('Dinesh');
    const row = name.closest('div')!.parentElement!;
    expect(row.textContent).toMatch(/15,000/);
    expect(row.textContent).not.toMatch(/30,000/);
  });
});

// Sprint 6 (S6-04): Sukanya Samriddhi gets a year-by-year view.
describe('Sukanya Samriddhi', () => {
  it('shows 21 years with paid and upcoming deposits and the maturity value', async () => {
    data['/api/investments'] = [{ id: 'v1', type: 'Test Sukanya Yojna', name: 'Test SSY', investedAmount: 30000, currentValue: 30000,
      startDate: '2024-04-10', yearlyContribution: 15000, interestRate: 8.2 }];
    at(<Investments />);
    const table = await screen.findByRole('table', { name: /sukanya samriddhi schedule for test ssy/i });
    expect(within(table).getAllByRole('row')).toHaveLength(22); // header + 21 years
    expect(within(table).getAllByText('Paid')).toHaveLength(2);
    expect(screen.getByText(/2 of 15 deposits made/i)).toBeInTheDocument();
    expect(screen.getByText(/matures/i)).toBeInTheDocument();
  });

  it('shows the part-paid current year as deposited so far', async () => {
    data['/api/investments'] = [{ id: 'v1', type: 'Test Sukanya Yojna', name: 'Test SSY', investedAmount: 35000, currentValue: 35000,
      startDate: '2026-05-02', yearlyContribution: 150000, interestRate: 8.2 }];
    at(<Investments />);
    const table = await screen.findByRole('table', { name: /sukanya samriddhi schedule/i });
    expect(within(table).getByText('₹35,000 of ₹1,50,000')).toBeInTheDocument();
  });

  it('asks for the start date and yearly deposit when they are missing', async () => {
    data['/api/investments'] = [{ id: 'v1', type: 'Test Sukanya Yojna', name: 'Test SSY', investedAmount: 35000, currentValue: 35000 }];
    at(<Investments />);
    expect(await screen.findByText(/add the account's opening date and yearly deposit/i)).toBeInTheDocument();
  });
});

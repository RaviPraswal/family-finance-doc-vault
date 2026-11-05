import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const apiClient = vi.fn();
vi.mock('../api/client', () => ({ apiClient: (...args: unknown[]) => apiClient(...args) }));

import Dashboard from '../pages/Dashboard';
import PortfolioOverview from '../pages/PortfolioOverview';
import Loans from '../pages/Loans';
import ChitFunds from '../pages/ChitFunds';
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

// Sprint 5 (S5-01): finance alerts belong on the cockpit, not in the Document Vault.
describe('Finance alerts', () => {
  it('the Document Vault no longer shows udhaar, EMI or balance alerts', async () => {
    at(<Dashboard />);
    await waitFor(() => expect(apiClient).toHaveBeenCalledWith('/api/documents'));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/overdue udhaar/i)).toBeNull();
    expect(screen.queryByText(/low balance/i)).toBeNull();
    expect(screen.queryByText(/critical family finance alerts/i)).toBeNull();
  });

  it('the cockpit lists them under "Needs attention" with working links', async () => {
    at(<PortfolioOverview />);
    const panel = await screen.findByRole('region', { name: /needs attention/i });
    const link = within(panel).getByRole('link', { name: /overdue udhaar: amit/i });
    expect(link.getAttribute('href')).toBe('/dashboard/peer-lending');
    expect(within(panel).getByText(/low balance: low bank/i)).toBeInTheDocument();
  });
});

// Sprint 5 (S5-02): the cockpit's monthly cash flow follows the Monthly Commitments plan when there is one.
describe('Cockpit cash flow', () => {
  it('uses this month\'s commitments plan', async () => {
    data['/api/commitments/plan'] = { month: '2026-11', income: 117706, mustPay: 108251, living: 15750, pausable: 6600,
      totalOutflow: 130601, plannedSurplus: -12895, safeSurplus: -6295, lines: [] };
    at(<PortfolioOverview />);
    const card = await screen.findByRole('region', { name: /monthly cash flow/i });
    await waitFor(() => expect(within(card).getByText(/from monthly commitments/i)).toBeInTheDocument());
    expect(within(card).getByText('₹1,17,706')).toBeInTheDocument();
    expect(within(card).getByText('₹-12,895')).toBeInTheDocument();
  });
});

// Sprint 5 (S5-03): the loan's full EMI schedule, and no crash on a loan without a principal.
describe('Loans', () => {
  it('shows every instalment with paid, overdue and upcoming months', async () => {
    at(<Loans />);
    const table = await screen.findByRole('table', { name: /emi schedule/i });
    const rows = within(table).getAllByRole('row');
    expect(rows.length).toBe(61); // header + 60 instalments
    expect(within(table).getAllByText('Paid')).toHaveLength(3);
    expect(within(table).getAllByText('Overdue').length).toBeGreaterThan(0);
    expect(screen.getByText(/3 of 60 paid/i)).toBeInTheDocument();
  });

  it('does not crash when a loan has no principal amount', async () => {
    data['/api/loans'] = [{ ...loan, principalAmount: null, tenureMonths: null, firstEmiDate: null }];
    at(<Loans />);
    expect(await screen.findAllByText('Test Bank')).not.toHaveLength(0);
  });
});

// Sprint 5 (S5-04): the chit's whole schedule in one view, and catching up several months at once.
describe('Chit funds', () => {
  it('opens the full schedule with a paid and remaining summary', async () => {
    at(<ChitFunds />);
    await userEvent.click(await screen.findByText('Test Chit'));
    const table = await screen.findByRole('table', { name: /chit schedule/i });
    expect(within(table).getAllByRole('row')).toHaveLength(21);
    expect(screen.getByText(/2 of 20 paid/i)).toBeInTheDocument();
  });

  it('marks every month up to the chosen one as paid', async () => {
    at(<ChitFunds />);
    await userEvent.click(await screen.findByText('Test Chit'));
    const table = await screen.findByRole('table', { name: /chit schedule/i });
    await userEvent.click(within(table).getAllByRole('button', { name: /paid up to here/i })[2]); // month 5
    await waitFor(() => expect(apiClient).toHaveBeenCalledWith(expect.stringContaining('/api/chitfunds'), expect.objectContaining({ method: 'PUT' })));
    const put = apiClient.mock.calls.find(([, o]) => o?.method === 'PUT')!;
    const saved = JSON.parse(JSON.parse(put[1].body).paymentSchedule);
    expect(saved.slice(0, 6).map((r: { status: string }) => r.status)).toEqual(['Paid & Closed', 'Paid & Closed', 'Paid & Closed', 'Paid & Closed', 'Paid & Closed', 'Open / Pending']);
  });
});

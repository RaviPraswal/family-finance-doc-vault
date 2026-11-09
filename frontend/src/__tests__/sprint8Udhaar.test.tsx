import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const apiClient = vi.fn();
vi.mock('../api/client', () => ({ apiClient: (...args: unknown[]) => apiClient(...args) }));

import PeerLending from '../pages/PeerLending';
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

// Sprint 8 S8-5: who owes me and whom I owe, per person.
describe('Udhaar summary', () => {
  it('shows each person\'s net and the money received back', async () => {
    data['/api/peerlendings'] = [
      { id: 'p1', type: 'GIVEN', personName: 'Test Lokesh', amount: 20000, principalAmount: 24000, repaidAmount: 4000, settled: false, date: '2026-06-01', expectedReturnDate: '2026-12-01' },
      { id: 'p2', type: 'TAKEN', personName: 'Test Pradeep', amount: 120000.01, principalAmount: 120000.01, repaidAmount: 0, settled: false, date: '2026-06-19', expectedReturnDate: '2026-12-19' },
    ];
    at(<PeerLending />);
    const people = await screen.findByRole('table', { name: /who owes whom/i });
    expect(within(people).getByText('Test Lokesh owes you ₹20,000')).toBeInTheDocument();
    expect(within(people).getByText('You owe Test Pradeep ₹1,20,000')).toBeInTheDocument();
    const received = screen.getByText('Total Received').parentElement!;
    expect(received.textContent).toMatch(/₹4,000/);
  });
});

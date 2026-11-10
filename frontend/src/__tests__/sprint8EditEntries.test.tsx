import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentType } from 'react';

const apiClient = vi.fn();
vi.mock('../api/client', () => ({ apiClient: (...args: unknown[]) => apiClient(...args) }));
const show = vi.fn((o: { onConfirm: () => void }) => o.onConfirm());
vi.mock('../store/confirmStore', () => ({ useConfirmStore: () => ({ show }) }));
const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
vi.mock('../store/toastStore', () => ({ useToastStore: () => toast }));

import Deposits from '../pages/Deposits';
import Loans from '../pages/Loans';
import BankAccounts from '../pages/BankAccounts';
import CreditCards from '../pages/CreditCards';
import Investments from '../pages/Investments';
import PeerLending from '../pages/PeerLending';

const rd = { id: 'd1', type: 'RD', institution: 'Test Bank', accountHolderName: 'Test Holder', principalAmount: 5000, maturityAmount: 78299,
  interestRate: 6.5, startDate: '2025-10-05', maturityDate: '2027-10-05', totalDeposited: 65000, monthlyDepositAmount: 5000, linkedAccount: { id: 'a1' } };
const loan = { id: 'l1', lenderName: 'Test Lender', loanType: 'Personal Loan', borrowerName: 'Test Borrower', principalAmount: 1500000,
  outstandingAmount: 1414925, emiAmount: 31863, interestRate: 10.5, interestMethod: 'MONTHLY', tenureMonths: 60, firstEmiDate: '2026-05-05',
  linkedAccount: { id: 'a1' } };
const account = { id: 'a1', bankName: 'Test Savings Bank', accountHolderName: 'Test Holder', accountNumber: 'XXXXXX1234',
  accountType: 'Savings', currentBalance: 12000, openingBalance: 10000 };

const card = { id: 'c1', cardName: 'Test Card', bankName: 'Test Bank', cardHolderName: 'Test Holder', cardNumber: 'XXXXXXXXXXXX4321',
  creditLimit: 100000, openingOutstanding: 0, billingCycleDate: 1, dueDate: 20, currentOutstanding: 0 };
const investment = { id: 'i1', type: 'MUTUAL_FUND', name: 'Test Fund', investedAmount: 10000, currentValue: 11000 };
const lending = { id: 'p1', type: 'LENT', personName: 'Test Friend', ownerName: 'Test Holder', amount: 5000, date: '2026-10-01',
  expectedReturnDate: '2026-12-01', settled: false, principalAmount: 5000, repaidAmount: 0 };

const data: Record<string, unknown[]> = { '/api/deposits': [rd], '/api/loans': [loan], '/api/bankaccounts': [account],
  '/api/creditcards': [card], '/api/investments': [investment], '/api/peerlendings': [lending] };
beforeEach(() => {
  vi.clearAllMocks();
  apiClient.mockImplementation((url: string, o?: { method?: string }) =>
    Promise.resolve(o?.method ? {} : data[url] ?? []));
});

const putTo = (url: string) => {
  const call = apiClient.mock.calls.find(([u, o]) => u === url && o?.method === 'PUT');
  return call ? JSON.parse(call[1].body) : undefined;
};

// Ravi, 2026-11-10: "i wanted the edit view also for these entries" — deposits and loans had only Delete, shown on hover.
describe('Every entry can be edited', () => {
  it('edits a deposit: the form opens filled in and the save keeps the fields it does not show', async () => {
    render(<Deposits />);
    await userEvent.click(await screen.findByRole('button', { name: /^edit test bank rd/i }));
    const dialog = screen.getByRole('dialog', { name: /edit deposit/i });
    const rate = within(dialog).getByDisplayValue('6.5');
    await userEvent.clear(rate);
    await userEvent.type(rate, '6.75');
    await userEvent.click(within(dialog).getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(putTo('/api/deposits/d1')).toBeDefined());
    expect(putTo('/api/deposits/d1')).toMatchObject({ id: 'd1', interestRate: 6.75, institution: 'Test Bank', totalDeposited: 65000, linkedAccount: { id: 'a1' } });
    expect(apiClient.mock.calls.some(([u, o]) => u === '/api/deposits' && o?.method === 'POST')).toBe(false);
  });

  it('edits a loan, keeping its schedule fields and bank link', async () => {
    render(<Loans />);
    await userEvent.click(await screen.findByRole('button', { name: /^edit test lender personal loan/i }));
    const dialog = screen.getByRole('dialog', { name: /edit loan/i });
    const emi = within(dialog).getByDisplayValue('31863');
    await userEvent.clear(emi);
    await userEvent.type(emi, '32000');
    await userEvent.click(within(dialog).getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(putTo('/api/loans/l1')).toBeDefined());
    expect(putTo('/api/loans/l1')).toMatchObject({ id: 'l1', emiAmount: 32000, tenureMonths: 60, firstEmiDate: '2026-05-05', linkedAccount: { id: 'a1' } });
  });

  it('edits a bank account without sending a new account number', async () => {
    render(<BankAccounts />);
    await userEvent.click(await screen.findByRole('button', { name: /^edit test savings bank/i }));
    const dialog = screen.getByRole('dialog', { name: /edit bank account/i });
    const holder = within(dialog).getByDisplayValue('Test Holder');
    await userEvent.clear(holder);
    await userEvent.type(holder, 'Renamed Holder');
    await userEvent.click(within(dialog).getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(putTo('/api/bankaccounts/a1')).toBeDefined());
    expect(putTo('/api/bankaccounts/a1')).toMatchObject({ id: 'a1', accountHolderName: 'Renamed Holder', openingBalance: 10000 });
  });

  it('edits an investment and an udhaar record the same way', async () => {
    const { unmount } = render(<Investments />);
    await userEvent.click(await screen.findByRole('button', { name: /^edit test fund/i }));
    let dialog = screen.getByRole('dialog', { name: /edit investment/i });
    await userEvent.click(within(dialog).getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(putTo('/api/investments/i1')).toMatchObject({ id: 'i1', name: 'Test Fund', investedAmount: 10000 }));
    unmount();

    render(<PeerLending />);
    await userEvent.click(await screen.findByRole('button', { name: /^edit test friend/i }));
    dialog = screen.getByRole('dialog', { name: /edit udhaar record/i });
    await userEvent.click(within(dialog).getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(putTo('/api/peerlendings/p1')).toMatchObject({ id: 'p1', personName: 'Test Friend', repaidAmount: 0 }));
  });

  it('cancelling an edit and adding next starts from an empty form', async () => {
    render(<Deposits />);
    await userEvent.click(await screen.findByRole('button', { name: /^edit test bank rd/i }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /cancel/i }));
    await userEvent.click(screen.getByRole('button', { name: /add deposit/i }));
    const dialog = screen.getByRole('dialog', { name: /add deposit/i });
    expect(within(dialog).queryByDisplayValue('Test Bank')).not.toBeInTheDocument();
  });

  // phones have no hover, so actions that appear only on hover can never be reached there
  it.each([
    ['Deposits', Deposits], ['Loans', Loans], ['BankAccounts', BankAccounts], ['CreditCards', CreditCards],
    ['Investments', Investments], ['PeerLending', PeerLending],
  ] as [string, ComponentType][])('%s keeps row actions visible without hover', async (_n, Page) => {
    const { container } = render(<Page />);
    await waitFor(() => expect(apiClient).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelectorAll('.opacity-0 button, .opacity-0 [role=button]')).toHaveLength(0);
  });
});

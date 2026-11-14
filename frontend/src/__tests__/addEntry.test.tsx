import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const apiClient = vi.fn();
vi.mock('../api/client', () => ({ apiClient: (...args: unknown[]) => apiClient(...args) }));
const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
vi.mock('../store/toastStore', () => ({ useToastStore: () => toast }));

import AddEntry from '../components/AddEntry';

const data: Record<string, unknown[]> = {
  '/api/bankaccounts': [{ id: 'a1', bankName: 'Test Bank', accountNumber: 'XXXX1111' }, { id: 'a2', bankName: 'Other Bank', accountNumber: 'XXXX2222' }],
  '/api/creditcards': [{ id: 'c1', cardName: 'Test Card', bankName: 'Card Bank' }],
  '/api/deposits': [{ id: 'd1', type: 'RD', institution: 'Test Bank' }, { id: 'd2', type: 'FD', institution: 'Locked Bank' }],
  '/api/investments': [{ id: 'i1', name: 'Test Fund', type: 'Mutual Fund' }],
  '/api/loans': [{ id: 'l1', lenderName: 'Test Lender', loanType: 'Personal Loan' }],
  '/api/chitfunds': [{ id: 'ch1', organizerName: 'Test Chit' }],
  '/api/peerlendings': [{ id: 'p1', personName: 'Test Friend', type: 'GIVEN' }],
  '/api/incomesources': [{ id: 's1', name: 'Tuition', type: 'SIDE_INCOME' }],
  '/api/projects': [],
};

beforeEach(() => {
  vi.clearAllMocks();
  apiClient.mockImplementation((url: string, o?: { method?: string }) => Promise.resolve(o?.method ? { id: 'new' } : data[url] ?? []));
});

const posts = () => apiClient.mock.calls.filter(([u, o]) => u === '/api/expenses' && o?.method === 'POST').map(([, o]) => JSON.parse(o.body));
const today = new Date().toISOString().slice(0, 10);

async function start(choice: RegExp) {
  const onSaved = vi.fn();
  render(<AddEntry open onClose={vi.fn()} onSaved={onSaved} />);
  const dialog = await screen.findByRole('dialog', { name: /add entry/i });
  await userEvent.click(within(dialog).getByRole('radio', { name: choice }));
  await waitFor(() => expect(within(dialog).getByLabelText(/^amount/i)).toBeInTheDocument());
  return { dialog, onSaved };
}

// Sprint 9: one way to add any entry — Money in, Money out, or Move my money.
describe('Add entry', () => {
  it('asks the one question first, in plain words', async () => {
    render(<AddEntry open onClose={vi.fn()} onSaved={vi.fn()} />);
    const dialog = await screen.findByRole('dialog', { name: /add entry/i });
    expect(within(dialog).getByRole('radio', { name: /money in/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: /money out/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: /move my money/i })).toBeInTheDocument();
    expect(within(dialog).queryByText(/debit|credit|made against/i)).not.toBeInTheDocument();
  });

  it('money in: salary into a bank account', async () => {
    const { dialog, onSaved } = await start(/money in/i);
    await userEvent.type(within(dialog).getByLabelText(/^amount/i), '50000');
    await userEvent.selectOptions(within(dialog).getByLabelText(/what was it/i), 'Salary');
    await userEvent.selectOptions(within(dialog).getByLabelText(/into which account/i), 'a1');
    await userEvent.click(within(dialog).getByRole('button', { name: /save entry/i }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]).toMatchObject({ type: 'CREDIT', amount: 50000, category: 'Salary', expenseDate: today, madeAgainst: 'MANUAL_ENTRY', linkedAccount: { id: 'a1' } });
    expect(onSaved).toHaveBeenCalled();
  });

  it('money in: side income is linked to its source', async () => {
    const { dialog } = await start(/money in/i);
    await userEvent.type(within(dialog).getByLabelText(/^amount/i), '3000');
    await userEvent.selectOptions(within(dialog).getByLabelText(/what was it/i), 'Side income');
    await userEvent.selectOptions(within(dialog).getByLabelText(/which side income/i), 's1');
    await userEvent.selectOptions(within(dialog).getByLabelText(/into which account/i), 'a1');
    await userEvent.click(within(dialog).getByRole('button', { name: /save entry/i }));
    await waitFor(() => expect(posts()[0]).toMatchObject({ type: 'CREDIT', category: 'Side income', madeAgainst: 'INCOME_SOURCE', linkedIncomeSource: { id: 's1' } }));
  });

  it('money out: spending paid from a bank account goes to one of the seven groups', async () => {
    const { dialog } = await start(/money out/i);
    const groups = within(within(dialog).getByLabelText(/what was it for/i)).getAllByRole('option').map((o) => o.textContent);
    expect(groups).toEqual(expect.arrayContaining(['Home & bills', 'Food & daily needs', 'Transport & travel', 'Health & insurance',
      'Education & children', 'Shopping & fun', 'Family & giving']));
    await userEvent.type(within(dialog).getByLabelText(/^amount/i), '1200.50');
    await userEvent.selectOptions(within(dialog).getByLabelText(/what was it for/i), 'Food & daily needs');
    await userEvent.selectOptions(within(dialog).getByLabelText(/paid from/i), 'account:a1');
    await userEvent.type(within(dialog).getByLabelText(/note/i), 'Weekly groceries');
    await userEvent.click(within(dialog).getByRole('button', { name: /save entry/i }));
    await waitFor(() => expect(posts()[0]).toMatchObject({ type: 'DEBIT', amount: 1200.5, category: 'Food & daily needs',
      description: 'Weekly groceries', madeAgainst: 'MANUAL_ENTRY', linkedAccount: { id: 'a1' } }));
  });

  it('money out on a credit card is recorded on the card (the bill payment later is a move)', async () => {
    const { dialog } = await start(/money out/i);
    await userEvent.type(within(dialog).getByLabelText(/^amount/i), '2000');
    await userEvent.selectOptions(within(dialog).getByLabelText(/what was it for/i), 'Shopping & fun');
    await userEvent.selectOptions(within(dialog).getByLabelText(/paid from/i), 'card:c1');
    await userEvent.click(within(dialog).getByRole('button', { name: /save entry/i }));
    await waitFor(() => expect(posts()[0]).toMatchObject({ type: 'DEBIT', madeAgainst: 'CREDIT_CARD', linkedCreditCard: { id: 'c1' }, linkedAccount: null }));
  });

  it.each([
    ['investment:i1', { madeAgainst: 'SIP_INVESTMENT', linkedInvestment: { id: 'i1' }, category: 'Investment' }],
    ['deposit:d1', { madeAgainst: 'RECURRING_DEPOSIT', linkedDeposit: { id: 'd1' }, category: 'Investment' }],
    ['loan:l1', { madeAgainst: 'LOAN_EMI', linkedLoan: { id: 'l1' }, category: 'Loan EMI' }],
    ['card:c1', { madeAgainst: 'CREDIT_CARD', linkedCreditCard: { id: 'c1' }, category: 'Credit Card Bill' }],
    ['chit:ch1', { madeAgainst: 'CHIT_INSTALLMENT', linkedChitFund: { id: 'ch1' }, category: 'Chit Fund Installment' }],
    ['udhaar:p1', { madeAgainst: 'PEER_LENDING', linkedPeerLending: { id: 'p1' }, category: 'Peer Lending (Udhaar)' }],
  ])('move: from a bank account to %s is one linked entry, not spending', async (to, expected) => {
    const { dialog } = await start(/move my money/i);
    await userEvent.type(within(dialog).getByLabelText(/^amount/i), '5000');
    await userEvent.selectOptions(within(dialog).getByLabelText(/from which account/i), 'a1');
    await userEvent.selectOptions(within(dialog).getByLabelText(/^to/i), to);
    await userEvent.click(within(dialog).getByRole('button', { name: /save entry/i }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]).toMatchObject({ type: 'DEBIT', amount: 5000, linkedAccount: { id: 'a1' }, ...expected });
  });

  it('move between two of my bank accounts writes both sides', async () => {
    const { dialog } = await start(/move my money/i);
    await userEvent.type(within(dialog).getByLabelText(/^amount/i), '1000');
    await userEvent.selectOptions(within(dialog).getByLabelText(/from which account/i), 'a1');
    expect(within(dialog).getByLabelText(/^to/i).querySelector('option[value="account:a1"]')).toBeNull(); // not to itself
    await userEvent.selectOptions(within(dialog).getByLabelText(/^to/i), 'account:a2');
    await userEvent.click(within(dialog).getByRole('button', { name: /save entry/i }));
    await waitFor(() => expect(posts()).toHaveLength(2));
    expect(posts()[0]).toMatchObject({ type: 'DEBIT', category: 'Self Transfer', linkedAccount: { id: 'a1' } });
    expect(posts()[1]).toMatchObject({ type: 'CREDIT', category: 'Self Transfer', linkedAccount: { id: 'a2' } });
  });

  it('only RDs take monthly money (an FD is added on the Deposits page)', async () => {
    const { dialog } = await start(/move my money/i);
    const to = within(dialog).getByLabelText(/^to/i);
    expect(within(to).queryByRole('option', { name: /locked bank/i })).toBeNull();
  });

  it('will not save without an amount above zero or an account', async () => {
    const { dialog } = await start(/money out/i);
    await userEvent.type(within(dialog).getByLabelText(/^amount/i), '0');
    await userEvent.click(within(dialog).getByRole('button', { name: /save entry/i }));
    expect(posts()).toHaveLength(0);
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/amount/i);
  });
});

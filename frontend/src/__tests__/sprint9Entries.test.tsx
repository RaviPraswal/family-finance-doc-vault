import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const apiClient = vi.fn();
vi.mock('../api/client', () => ({ apiClient: (...args: unknown[]) => apiClient(...args) }));
const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
vi.mock('../store/toastStore', () => ({ useToastStore: () => toast }));
vi.mock('../store/confirmStore', () => ({ useConfirmStore: () => ({ show: vi.fn() }) }));

import Expenses from '../pages/Expenses';
import { placeOf } from '../lib/simpleMoney';

const entries = [
  { id: 'e1', type: 'CREDIT', kind: 'INCOME', category: 'Salary', amount: 50000, expenseDate: '2026-11-01', madeAgainst: 'MANUAL_ENTRY', description: 'Pay' },
  { id: 'e2', type: 'DEBIT', kind: 'EXPENSE', category: 'Groceries', amount: 4000, expenseDate: '2026-11-02', madeAgainst: 'MANUAL_ENTRY', description: 'Weekly shop' },
  { id: 'e3', type: 'DEBIT', kind: 'EXPENSE', category: 'Misc', amount: 300, expenseDate: '2026-11-03', madeAgainst: 'MANUAL_ENTRY', description: 'Odd one',
    linkedAccount: { id: 'a1', bankName: 'Test Bank', currentBalance: 9 } },
  { id: 'e4', type: 'DEBIT', kind: 'INVESTMENT', category: 'Investment', amount: 5000, expenseDate: '2026-11-04', madeAgainst: 'SIP_INVESTMENT', description: 'SIP',
    linkedInvestment: { id: 'i1', name: 'Test Fund' } },
];

beforeEach(() => {
  vi.clearAllMocks();
  apiClient.mockImplementation((url: string, o?: { method?: string }) => Promise.resolve(o?.method ? {} : url === '/api/expenses' ? entries : []));
});

describe('Where an entry sits (placeOf)', () => {
  it('names the category and group in plain words', () => {
    expect(placeOf(entries[0])).toEqual({ top: 'Money in', group: 'Salary', needsSorting: false });
    expect(placeOf(entries[1])).toEqual({ top: 'Money out', group: 'Food & daily needs', needsSorting: false });
    expect(placeOf(entries[2])).toEqual({ top: 'Money out', group: null, needsSorting: true });
    expect(placeOf(entries[3])).toEqual({ top: 'Moved', group: 'Into savings & investments', needsSorting: false });
    expect(placeOf({ type: 'DEBIT', kind: 'LOAN_PAYMENT', category: 'Loan EMI' }).group).toBe('Loan payment');
    expect(placeOf({ type: 'DEBIT', kind: 'TRANSFER', category: 'Credit Card Bill' }).group).toBe('Between my own accounts');
    expect(placeOf({ type: 'DEBIT', kind: 'LENDING', category: 'Peer Lending (Udhaar)' }).group).toBe('Udhaar');
    expect(placeOf({ type: 'CREDIT', kind: 'INCOME', category: 'Refund' })).toEqual({ top: 'Money out', group: 'Refund (lowers spending)', needsSorting: false });
  });
});

// Sprint 9 stage 2: the entries list speaks the four categories.
describe('All entries', () => {
  const rowOf = async (text: string) => (await screen.findByText(text)).closest('tr') as HTMLElement;

  it('shows each entry as Money in, Money out or Moved, with its plain group', async () => {
    render(<Expenses />);
    expect(within(await rowOf('Weekly shop')).getByText('Money out')).toBeInTheDocument();
    expect(within(await rowOf('Weekly shop')).getByText('Food & daily needs')).toBeInTheDocument();
    expect(within(await rowOf('Pay')).getByText('Money in')).toBeInTheDocument();
    expect(within(await rowOf('SIP')).getByText('Moved')).toBeInTheDocument();
    expect(within(await rowOf('SIP')).queryByText(/SIP_INVESTMENT|SIP INVESTMENT/)).not.toBeInTheDocument();
  });

  it('filters by the plain categories instead of debit / credit', async () => {
    render(<Expenses />);
    await rowOf('Pay');
    const filter = screen.getByLabelText(/show entries/i);
    expect(within(filter).getAllByRole('option').map((o) => o.textContent)).toEqual(['All entries', 'Money in', 'Money out', 'Moved', 'Not sorted yet']);
    await userEvent.selectOptions(filter, 'Not sorted yet');
    expect(screen.getByText('Odd one')).toBeInTheDocument();
    expect(screen.queryByText('Weekly shop')).not.toBeInTheDocument();
    expect(screen.queryByText('Pay')).not.toBeInTheDocument();
  });

  it('sorts an unsorted entry into a group, keeping everything else about it', async () => {
    render(<Expenses />);
    const row = await rowOf('Odd one');
    expect(within(await rowOf('Weekly shop')).queryByLabelText(/sort .* into/i)).toBeNull(); // only unsorted rows ask
    await userEvent.selectOptions(within(row).getByLabelText(/sort .* into/i), 'Shopping & fun');
    await waitFor(() => expect(apiClient).toHaveBeenCalledWith('/api/expenses/e3', expect.objectContaining({ method: 'PUT' })));
    const body = JSON.parse(apiClient.mock.calls.find(([u, o]) => u === '/api/expenses/e3' && o?.method === 'PUT')![1].body);
    expect(body).toEqual({ amount: 300, category: 'Shopping & fun', expenseDate: '2026-11-03', description: 'Odd one', type: 'DEBIT',
      madeAgainst: 'MANUAL_ENTRY', linkedAccount: { id: 'a1' }, linkedLoan: null, linkedChitFund: null, linkedPeerLending: null,
      linkedInvestment: null, linkedDeposit: null, linkedProject: null, linkedIncomeSource: null, linkedCreditCard: null, customFieldsData: null });
  });

  it('adds through the one Add entry; the old detailed form is tucked away until asked for or editing', async () => {
    render(<Expenses />);
    await rowOf('Pay');
    expect(screen.getByRole('heading', { level: 2, name: 'All entries' })).toBeInTheDocument();
    expect(screen.queryByText('Made Against')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^add entry$/i }));
    expect(screen.getByRole('dialog', { name: /add entry/i })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');

    await userEvent.click(screen.getByRole('button', { name: /detailed form/i }));
    expect(screen.getByText('Made Against')).toBeInTheDocument();
  });
});

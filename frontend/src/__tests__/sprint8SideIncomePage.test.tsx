import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const apiClient = vi.fn();
vi.mock('../api/client', () => ({ apiClient: (...args: unknown[]) => apiClient(...args) }));

import SideIncome from '../pages/SideIncome';

// Sprint 8 fix (reported as a member): the add form has amount and frequency, each source can be edited and have a
// payment recorded from the list, and every payment received is listed with date, amount and bank.
let data: Record<string, unknown>;
beforeEach(() => {
  data = {
    '/api/incomesources': [{ id: 's1', sourceName: 'Test Tuition', ownerName: 'Test Member', amount: 15000, frequency: 'Monthly' }],
    '/api/expenses': [
      { id: 'e1', type: 'CREDIT', amount: 15000, expenseDate: '2026-10-05', category: 'Side Income', madeAgainst: 'MANUAL_ENTRY',
        linkedIncomeSource: { id: 's1', sourceName: 'Test Tuition' }, linkedAccount: { id: 'a1', bankName: 'Test Bank' }, description: 'October' },
    ],
    '/api/bankaccounts': [{ id: 'a1', bankName: 'Test Bank', name: 'Savings' }],
  };
  apiClient.mockReset();
  apiClient.mockImplementation((url: string, o?: { method?: string }) => {
    if (o?.method && o.method !== 'GET') return Promise.resolve({ id: 'new' });
    return Promise.resolve(data[url.split('?')[0]] ?? []);
  });
});

describe('Side income page', () => {
  it('adds a source with its expected amount and frequency', async () => {
    render(<SideIncome />);
    await userEvent.click(await screen.findByRole('button', { name: /add source/i }));
    const dialog = screen.getByRole('dialog', { name: /add income source/i });
    await userEvent.type(within(dialog).getByLabelText(/source name/i), 'Test Rent');
    await userEvent.type(within(dialog).getByLabelText(/received from/i), 'Tenant');
    await userEvent.type(within(dialog).getByLabelText(/expected amount/i), '9000');
    await userEvent.selectOptions(within(dialog).getByLabelText(/how often/i), 'Quarterly');
    await userEvent.click(within(dialog).getByRole('button', { name: /save source/i }));
    const post = apiClient.mock.calls.find(([u, o]) => u === '/api/incomesources' && o?.method === 'POST');
    expect(JSON.parse(post![1].body)).toEqual({ sourceName: 'Test Rent', ownerName: 'Tenant', amount: 9000, frequency: 'Quarterly' });
  });

  it('edits a source from the list', async () => {
    render(<SideIncome />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Test Tuition' }));
    const dialog = screen.getByRole('dialog', { name: /edit income source/i });
    const amount = within(dialog).getByLabelText(/expected amount/i);
    await userEvent.clear(amount);
    await userEvent.type(amount, '16000');
    await userEvent.click(within(dialog).getByRole('button', { name: /save source/i }));
    const put = apiClient.mock.calls.find(([u, o]) => u === '/api/incomesources/s1' && o?.method === 'PUT');
    expect(JSON.parse(put![1].body)).toMatchObject({ sourceName: 'Test Tuition', amount: 16000, frequency: 'Monthly' });
  });

  it('records a payment from the list, prefilled with the expected amount, with one ledger entry only', async () => {
    render(<SideIncome />);
    await userEvent.click(await screen.findByRole('button', { name: 'Record payment for Test Tuition' }));
    const dialog = screen.getByRole('dialog', { name: /record payment/i });
    expect(within(dialog).getByLabelText(/amount received/i)).toHaveValue(15000);
    await userEvent.click(within(dialog).getByRole('button', { name: /save payment/i }));
    const writes = apiClient.mock.calls.filter(([, o]) => o?.method && o.method !== 'GET');
    expect(writes).toHaveLength(1);
    expect(writes[0][0]).toBe('/api/expenses');
    expect(JSON.parse(writes[0][1].body)).toMatchObject({ amount: 15000, type: 'CREDIT', madeAgainst: 'INCOME_SOURCE', linkedIncomeSource: { id: 's1' } });
  });

  it('lists every payment received with date, source, amount and bank', async () => {
    render(<SideIncome />);
    const table = await screen.findByRole('table', { name: /payments received/i });
    const row = within(table).getAllByRole('row')[1];
    expect(within(row).getByText('5 Oct 2026')).toBeInTheDocument();
    expect(within(row).getByText('Test Tuition')).toBeInTheDocument();
    expect(within(row).getByText('₹15,000')).toBeInTheDocument();
    expect(within(row).getByText('Test Bank')).toBeInTheDocument();
  });
});

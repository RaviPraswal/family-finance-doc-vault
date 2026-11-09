import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const apiClient = vi.fn();
vi.mock('../api/client', () => ({ apiClient: (...args: unknown[]) => apiClient(...args) }));

import Investments from '../pages/Investments';
import { useThemeStore } from '../store/themeStore';

// Sprint 8 · S8-3: the Sukanya account shows every entry made so far, and offers to link stray ones.
let data: Record<string, unknown>;
beforeEach(() => {
  data = {
    '/api/investments': [{ id: 'v1', type: 'Test Sukanya Yojna', name: 'Test Child SSY', investedAmount: 30000, currentValue: 30000,
      startDate: '2026-05-02', yearlyContribution: 150000, interestRate: 8.2 }],
    '/api/expenses': [
      { id: 'e1', expenseDate: '2026-05-02', amount: 10000, type: 'DEBIT', category: 'Investment', description: 'First deposit', linkedInvestment: { id: 'v1' } },
      { id: 'e2', expenseDate: '2026-07-02', amount: 20000, type: 'DEBIT', category: 'Investment', description: 'Second deposit', linkedInvestment: { id: 'v1' } },
      { id: 'e3', expenseDate: '2026-09-02', amount: 5000, type: 'DEBIT', category: 'Investment', description: 'Child investment', linkedAccount: { id: 'a1' } },
    ],
  };
  apiClient.mockReset();
  apiClient.mockImplementation((url: string, opts?: { method?: string }) => {
    if (opts?.method && opts.method !== 'GET') return Promise.resolve({});
    return Promise.resolve(data[url.split('?')[0]] ?? []);
  });
  useThemeStore.setState({ skin: 'classic' });
});

describe('Sukanya entries', () => {
  it('lists every linked entry with a running total', async () => {
    render(<MemoryRouter><Investments /></MemoryRouter>);
    const table = await screen.findByRole('table', { name: /entries for test child ssy/i });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3); // header + 2 entries
    expect(within(rows[2]).getByText('₹30,000')).toBeInTheDocument();
    expect(screen.getByText(/2 entries · ₹30,000 paid in/i)).toBeInTheDocument();
  });

  it('links a stray entry that mentions the child to the account', async () => {
    render(<MemoryRouter><Investments /></MemoryRouter>);
    const link = await screen.findByRole('button', { name: /link child investment of 2 sept 2026/i });
    await userEvent.click(link);
    const put = apiClient.mock.calls.find(([url, o]) => url === '/api/expenses/e3' && o?.method === 'PUT');
    expect(put).toBeTruthy();
    expect(JSON.parse(put![1].body)).toMatchObject({ linkedInvestment: { id: 'v1' }, linkedAccount: { id: 'a1' }, madeAgainst: 'SIP_INVESTMENT' });
  });
});

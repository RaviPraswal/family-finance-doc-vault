import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BalanceCheckPanel from '../components/BalanceCheckPanel';

const apiClient = vi.fn();
vi.mock('../api/client', () => ({ apiClient: (...args: unknown[]) => apiClient(...args) }));

// Sprint 8 · S8-1: enter each bank's real closing balance; differences are posted by the server.
const accounts = [
  { id: 'a1', bankName: 'Test Bank One', currentBalance: 6000 },
  { id: 'a2', bankName: 'Test Bank Two', currentBalance: 1000 },
];
beforeEach(() => {
  apiClient.mockReset();
  apiClient.mockImplementation((url: string, opts?: { method?: string; body?: string }) => {
    if (url === '/api/bankaccounts/balance-checks/latest') return Promise.resolve([{ accountId: 'a2', checkDate: '2026-11-09', difference: 0 }]);
    if (opts?.method === 'POST') {
      const actual = Number(JSON.parse(opts.body!).actualBalance);
      return Promise.resolve({ accountId: url.split('/')[3], difference: actual - 6000, adjustmentId: 'x' });
    }
    return Promise.resolve([]);
  });
});

describe('Daily balance check', () => {
  it('shows each account with its last check and flags the unchecked one', async () => {
    render(<BalanceCheckPanel accounts={accounts} today="2026-11-09" onDone={() => {}} />);
    const table = await screen.findByRole('table', { name: /daily balance check/i });
    expect(within(table).getByText('Never checked')).toBeInTheDocument();
    expect(within(table).getByText('Checked today')).toBeInTheDocument();
    expect(screen.getByText(/1 account not checked today/i)).toBeInTheDocument();
  });

  it('previews the difference and saves only the balances entered', async () => {
    const onDone = vi.fn();
    render(<BalanceCheckPanel accounts={accounts} today="2026-11-09" onDone={onDone} />);
    await userEvent.type(await screen.findByLabelText(/bank shows for test bank one/i), '5800.50');
    expect(screen.getByText('-₹199.50')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /save balances/i }));
    const posts = apiClient.mock.calls.filter(([, o]) => o?.method === 'POST');
    expect(posts).toHaveLength(1);
    expect(posts[0][0]).toBe('/api/bankaccounts/a1/balance-checks');
    expect(JSON.parse(posts[0][1].body)).toEqual({ actualBalance: '5800.50', checkDate: '2026-11-09' });
    expect(onDone).toHaveBeenCalled();
  });
});

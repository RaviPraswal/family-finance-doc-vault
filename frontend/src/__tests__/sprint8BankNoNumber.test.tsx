import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const apiClient = vi.fn();
vi.mock('../api/client', () => ({ apiClient: (...args: unknown[]) => apiClient(...args) }));
import BankAccounts from '../pages/BankAccounts';

// Sprint 8 fix (found end-to-end): an account saved without an account number crashed the whole page.
beforeEach(() => {
  apiClient.mockReset();
  apiClient.mockImplementation((url: string) => Promise.resolve(
    url.startsWith('/api/bankaccounts/balance-checks') ? [] :
    url.startsWith('/api/bankaccounts') ? [{ id: 'a1', bankName: 'Test Bank', name: 'Savings', accountType: 'Savings', accountNumber: null, currentBalance: 1000, openingBalance: 1000 }] : []));
});

describe('Bank accounts without an account number', () => {
  it('renders instead of crashing', async () => {
    render(<MemoryRouter><BankAccounts /></MemoryRouter>);
    expect((await screen.findAllByText('Test Bank')).length).toBeGreaterThan(0);
  });
});

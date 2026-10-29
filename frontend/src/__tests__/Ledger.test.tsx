import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const apiClient = vi.fn();
vi.mock('../api/client', () => ({ apiClient: (...args: unknown[]) => apiClient(...args) }));

const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
vi.mock('../store/toastStore', () => ({ useToastStore: () => toast }));

import Ledger from '../pages/Ledger';

const parsedSchedule = {
  scheduleType: 'LOAN_EMI',
  institutionName: 'Test Bank',
  description: 'Home loan',
  installments: [{ amount: 1000, dueDate: '2026-12-05' }],
};

// Sprint 1, P0-4: a parsed schedule must be saved against an account the user picks.
describe('Ledger: saving an AI-parsed schedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.mockImplementation((url: string) => {
      if (url === '/api/transactions/scheduled/pending') return Promise.resolve([]);
      if (url === '/api/bankaccounts') return Promise.resolve([{ id: 'acc-1', bankName: 'SBI', accountNumber: '1234567890' }]);
      if (url === '/api/ai/parse-schedule') return Promise.resolve(parsedSchedule);
      return Promise.resolve({});
    });
  });

  async function uploadSchedule() {
    const user = userEvent.setup();
    const { container } = render(<Ledger />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(['%PDF'], 'schedule.pdf', { type: 'application/pdf' }));
    await screen.findByLabelText(/pay from bank account/i);
    return user;
  }

  it('lists the family\'s own bank accounts with masked numbers', async () => {
    await uploadSchedule();
    expect(screen.getByRole('option', { name: /SBI .*7890/ })).toBeInTheDocument();
  });

  it('blocks saving until an account is chosen', async () => {
    const user = await uploadSchedule();
    await user.click(screen.getByRole('button', { name: /approve & save schedule/i }));

    expect(toast.error).toHaveBeenCalledWith('Choose an account', expect.any(String));
    expect(apiClient).not.toHaveBeenCalledWith(expect.stringContaining('/api/ai/save-schedule'), expect.anything());
  });

  it('sends the chosen account id to the server', async () => {
    const user = await uploadSchedule();
    await user.selectOptions(screen.getByLabelText(/pay from bank account/i), 'acc-1');
    await user.click(screen.getByRole('button', { name: /approve & save schedule/i }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith('/api/ai/save-schedule?bankAccountId=acc-1', expect.objectContaining({ method: 'POST' })),
    );
    expect(toast.success).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const apiClient = vi.fn();
vi.mock('../api/client', () => ({ apiClient: (...args: unknown[]) => apiClient(...args) }));
const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
vi.mock('../store/toastStore', () => ({ useToastStore: () => toast }));
vi.mock('../store/confirmStore', () => ({ useConfirmStore: () => ({ show: vi.fn() }) }));

import UpcomingPayments from '../pages/UpcomingPayments';

beforeEach(() => {
  vi.clearAllMocks();
  apiClient.mockImplementation((url: string) => Promise.resolve(url.startsWith('/api/commitments/plan')
    ? { month: '2026-11', income: 0, mustPay: 0, living: 0, pausable: 0, plannedSurplus: 0, safeSurplus: 0, lines: [] }
    : []));
});

const at = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/dashboard/commitments" element={<UpcomingPayments />} /></Routes>
  </MemoryRouter>,
);

// Sprint 9 stage 3: Monthly Commitments and the scheduled-payments ledger are one "Upcoming payments" page.
describe('Upcoming payments', () => {
  it('opens on the month plan and switches to scheduled payments', async () => {
    at('/dashboard/commitments');
    expect(screen.getByRole('heading', { level: 1, name: /upcoming payments/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /this month's plan/i })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('heading', { name: /monthly commitments/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /scheduled & due/i }));
    expect(screen.getByRole('tab', { name: /scheduled & due/i })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('heading', { name: /scheduled payments/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /monthly commitments/i })).not.toBeInTheDocument();
  });

  it('an old link to the ledger lands on the scheduled tab', async () => {
    at('/dashboard/commitments?tab=scheduled');
    expect(screen.getByRole('tab', { name: /scheduled & due/i })).toHaveAttribute('aria-selected', 'true');
  });
});

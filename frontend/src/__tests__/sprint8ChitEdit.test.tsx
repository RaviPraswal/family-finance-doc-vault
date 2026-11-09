import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const apiClient = vi.fn();
vi.mock('../api/client', () => ({ apiClient: (...args: unknown[]) => apiClient(...args) }));
const show = vi.fn((o: { onConfirm: () => void }) => o.onConfirm());
vi.mock('../store/confirmStore', () => ({ useConfirmStore: () => ({ show }) }));

import ChitFunds from '../pages/ChitFunds';

// Sprint 8 fix: the chit list has Edit and Mark closed on every row (always visible), and counts active chits correctly.
const chits = [
  { id: 'c1', organizerName: 'Committee A', memberName: 'Test Member', totalValue: 50000, monthlyInstallment: 5000, durationMonths: 10,
    pendingInstallments: 2, startDate: '2026-04-01', isAllotted: true, allottedAmount: 49550, isClosed: false, closedOn: null, linkedAccount: { id: 'a1' } },
  { id: 'c2', organizerName: 'Committee B', memberName: 'Test Member', totalValue: 100000, monthlyInstallment: 5000, durationMonths: 20,
    pendingInstallments: 20, startDate: '2026-04-01', isAllotted: false, allottedAmount: null, isClosed: true, closedOn: '2026-11-01', linkedAccount: null },
];
beforeEach(() => {
  apiClient.mockReset();
  apiClient.mockImplementation((url: string, o?: { method?: string }) => {
    if (o?.method) return Promise.resolve({});
    if (url.startsWith('/api/chitfunds')) return Promise.resolve(chits);
    return Promise.resolve([]);
  });
});

describe('Chit list actions', () => {
  it('shows active vs closed counts and the status in words', async () => {
    render(<ChitFunds />);
    expect(await screen.findByText('1 Active')).toBeInTheDocument();
    expect(screen.getByText(/1 closed/i)).toBeInTheDocument();
    expect(screen.getByText('Closed on 1 Nov 2026')).toBeInTheDocument();
  });

  it('edits a chit with a PUT that keeps its id, link and closed state', async () => {
    render(<ChitFunds />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Committee A' }));
    const dialog = screen.getByRole('dialog', { name: /edit chit fund/i });
    const organizer = within(dialog).getByDisplayValue('Committee A');
    await userEvent.clear(organizer);
    await userEvent.type(organizer, 'Committee 04/26');
    await userEvent.click(within(dialog).getByRole('button', { name: /save changes/i }));
    const put = apiClient.mock.calls.find(([u, o]) => u === '/api/chitfunds/c1' && o?.method === 'PUT');
    expect(put).toBeTruthy();
    expect(JSON.parse(put![1].body)).toMatchObject({ organizerName: 'Committee 04/26', isClosed: false, linkedAccount: { id: 'a1' } });
    expect(apiClient.mock.calls.some(([u, o]) => u === '/api/chitfunds' && o?.method === 'POST')).toBe(false);
  });

  it('marks a chit closed and reopens a closed one', async () => {
    render(<ChitFunds />);
    await userEvent.click(await screen.findByRole('button', { name: 'Mark Committee A closed' }));
    let put = apiClient.mock.calls.find(([u, o]) => u === '/api/chitfunds/c1' && o?.method === 'PUT');
    expect(JSON.parse(put![1].body)).toMatchObject({ isClosed: true });
    await userEvent.click(screen.getByRole('button', { name: 'Reopen Committee B' }));
    put = apiClient.mock.calls.find(([u, o]) => u === '/api/chitfunds/c2' && o?.method === 'PUT');
    expect(JSON.parse(put![1].body)).toMatchObject({ isClosed: false });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const apiClient = vi.fn();
vi.mock('../api/client', () => ({ apiClient: (...args: unknown[]) => apiClient(...args) }));
const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
vi.mock('../store/toastStore', () => ({ useToastStore: () => toast }));
vi.mock('../store/confirmStore', () => ({ useConfirmStore: () => ({ show: vi.fn() }) }));

import PeerLending from '../pages/PeerLending';

const records = [
  { id: 'p1', type: 'GIVEN', personName: 'Lent Friend', ownerName: 'Me', amount: 5000, principalAmount: 5000, date: '2026-10-01', expectedReturnDate: '2026-12-01', settled: false },
  { id: 'p2', type: 'TAKEN', personName: 'Lender Uncle', ownerName: 'Me', amount: 3000, principalAmount: 3000, date: '2026-10-05', expectedReturnDate: '2026-12-05', settled: false },
];
beforeEach(() => {
  vi.clearAllMocks();
  apiClient.mockImplementation((url: string) => Promise.resolve(url === '/api/peerlendings' ? records : []));
});

// Sprint 9 stage 4: udhaar you gave is something you own; udhaar you took is a debt — two separate lists.
describe('Udhaar, split', () => {
  it('"Money others owe you" lists only what you lent, and adds a lent record by default', async () => {
    render(<PeerLending only="GIVEN" />);
    expect(screen.getByRole('heading', { level: 1, name: /money others owe you/i })).toBeInTheDocument();
    expect((await screen.findAllByText('Lent Friend')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Lender Uncle')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument(); // no given/taken choice here
  });

  it('"Money you borrowed" lists only what you took, and a new record is a borrowed one', async () => {
    render(<PeerLending only="TAKEN" />);
    expect(screen.getByRole('heading', { level: 1, name: /money you borrowed/i })).toBeInTheDocument();
    expect((await screen.findAllByText('Lender Uncle')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Lent Friend')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    const dialog = screen.getByRole('dialog');
    const text = within(dialog).getAllByRole('textbox');
    await userEvent.type(text[0], 'New Lender');
    for (const n of within(dialog).getAllByRole('spinbutton')) await userEvent.type(n, '1000');
    dialog.querySelectorAll('input[type="date"]').forEach((el) => fireEvent.change(el, { target: { value: '2026-11-10' } }));
    await userEvent.click(within(dialog).getByRole('button', { name: /save/i }));
    const post = apiClient.mock.calls.find(([u, o]) => u === '/api/peerlendings' && o?.method === 'POST');
    expect(post && JSON.parse(post[1].body).type).toBe('TAKEN');
  });

  it('without a side it still shows both (old link)', async () => {
    render(<PeerLending />);
    expect((await screen.findAllByText('Lent Friend')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lender Uncle').length).toBeGreaterThan(0);
  });
});

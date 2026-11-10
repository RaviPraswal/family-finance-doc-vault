import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const apiClient = vi.fn();
vi.mock('../api/client', () => ({ apiClient: (...args: unknown[]) => apiClient(...args) }));
const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };
vi.mock('../store/toastStore', () => ({ useToastStore: () => toast }));

import QuickLogger from '../pages/QuickLogger';
import { useAuthStore } from '../store/authStore';

const KEY = 'fin_quick_templates';
const browserTemplates = [
  { id: 'tpl-1', name: 'Owner Salary', amount: 50000, category: 'Wages', type: 'CREDIT', madeAgainst: 'INCOME_SOURCE' },
  { id: 'tpl-9', name: 'Owner SIP', amount: 2000, category: 'Investment', type: 'DEBIT', madeAgainst: 'SIP_INVESTMENT' },
];

function serverWith(saved: object[]) {
  apiClient.mockImplementation((url: string, init?: RequestInit) => {
    if (url === '/api/quick-templates' && !init?.method) return Promise.resolve(saved);
    if (url === '/api/quick-templates' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      return Promise.resolve({ ...body, id: `srv-${body.name}` });
    }
    if (init?.method === 'DELETE') return Promise.resolve(null);
    return Promise.resolve([]);
  });
}

const signIn = (role: 'OWNER' | 'MEMBER') =>
  useAuthStore.getState().setSession({ name: role, email: `${role.toLowerCase()}@test.invalid`, role }, null);

// Sprint 8 (Ravi, 2026-11-10): a member saw the owner's templates — they lived in the browser, shared by everyone.
describe('Quick Logger templates belong to the signed-in person', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('loads the person\'s own templates from the server, with no built-in samples', async () => {
    signIn('MEMBER');
    serverWith([]);
    render(<QuickLogger />);
    expect(await screen.findByText(/no templates yet/i)).toBeInTheDocument();
    expect(apiClient).toHaveBeenCalledWith('/api/quick-templates');
    expect(screen.queryByText(/salary/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sukanya|netflix|airtel/i)).not.toBeInTheDocument();
  });

  it('never shows a member the templates another person left in this browser, and leaves them alone', async () => {
    signIn('MEMBER');
    localStorage.setItem(KEY, JSON.stringify(browserTemplates));
    serverWith([{ id: 'm1', name: 'Bus pass', amount: 300, category: 'Daily Life', type: 'DEBIT', madeAgainst: 'MANUAL_ENTRY' }]);
    render(<QuickLogger />);
    expect(await screen.findByText('Bus pass')).toBeInTheDocument();
    expect(screen.queryByText('Owner Salary')).not.toBeInTheDocument();
    expect(apiClient).not.toHaveBeenCalledWith('/api/quick-templates', expect.objectContaining({ method: 'POST' }));
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });

  it('moves the owner\'s browser templates to their account once, then clears the browser copy', async () => {
    signIn('OWNER');
    localStorage.setItem(KEY, JSON.stringify(browserTemplates));
    serverWith([]);
    render(<QuickLogger />);
    expect(await screen.findByText('Owner Salary')).toBeInTheDocument();
    expect(screen.getByText('Owner SIP')).toBeInTheDocument();
    const posts = apiClient.mock.calls.filter(([u, i]) => u === '/api/quick-templates' && i?.method === 'POST');
    expect(posts).toHaveLength(2);
    expect(JSON.parse(posts[0][1].body)).not.toHaveProperty('id');
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('creates and deletes templates on the server', async () => {
    signIn('MEMBER');
    serverWith([{ id: 'm1', name: 'Bus pass', amount: 300, category: 'Daily Life', type: 'DEBIT', madeAgainst: 'MANUAL_ENTRY' }]);
    const user = userEvent.setup();
    render(<QuickLogger />);
    await screen.findByText('Bus pass');

    await user.click(screen.getByRole('button', { name: /remove template bus pass/i }));
    await waitFor(() => expect(apiClient).toHaveBeenCalledWith('/api/quick-templates/m1', expect.objectContaining({ method: 'DELETE' })));
    await waitFor(() => expect(screen.queryByText('Bus pass')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /new template/i }));
    await user.type(screen.getByPlaceholderText(/template name|e\.g\./i), 'Gym');
    await user.type(screen.getByPlaceholderText(/amount|0\.00|₹/i), '1500');
    await user.click(screen.getByRole('button', { name: /create template/i }));
    await waitFor(() => expect(apiClient).toHaveBeenCalledWith('/api/quick-templates', expect.objectContaining({ method: 'POST' })));
    expect(await screen.findByText('Gym')).toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('keeps no one\'s personal data in the code', () => {
    const src = readFileSync(resolve(__dirname, '../pages/QuickLogger.tsx'), 'utf8');
    expect(src).not.toMatch(/defaultTemplates|Sukanya|amount:\s*\d{3,}/i);
  });
});

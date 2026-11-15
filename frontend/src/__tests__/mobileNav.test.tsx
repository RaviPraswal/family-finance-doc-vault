import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';

const app = () => render(
  <MemoryRouter initialEntries={['/dashboard']}>
    <Routes>
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<p>Overview page</p>} />
        <Route path="loans" element={<p>Loans page</p>} />
      </Route>
    </Routes>
  </MemoryRouter>,
);

// Ravi, 2026-11-10: "not a responsive website" — on a phone the sidebar was hidden and nothing replaced it,
// so there was no way to reach any other page.
describe('Phone navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.setState({ skin: 'liquid', theme: 'light' });
    useAuthStore.getState().setSession({ name: 'Test Owner', email: 'owner@test.invalid', role: 'OWNER' }, null);
  });

  it('opens a menu with every page, goes to the page and closes', async () => {
    app();
    expect(screen.queryByRole('dialog', { name: /navigation/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /open menu/i }));
    const menu = screen.getByRole('dialog', { name: /navigation/i });
    expect(within(menu).getByRole('link', { name: /loans & emi/i })).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: /family members/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /logout/i })).toBeInTheDocument();
    await userEvent.click(within(menu).getByRole('link', { name: /loans & emi/i }));
    expect(screen.getByText('Loans page')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /navigation/i })).not.toBeInTheDocument();
  });

  it('closes with Escape and with the close button', async () => {
    app();
    await userEvent.click(screen.getByRole('button', { name: /open menu/i }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /navigation/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /open menu/i }));
    await userEvent.click(screen.getByRole('button', { name: /close menu/i }));
    expect(screen.queryByRole('dialog', { name: /navigation/i })).not.toBeInTheDocument();
  });

  // Sprint 9: the menu follows the four plain categories.
  it('groups pages under Money In, Money Out, Savings & Investments, Debts', async () => {
    app();
    await userEvent.click(screen.getByRole('button', { name: /open menu/i }));
    const menu = screen.getByRole('dialog', { name: /navigation/i });
    const section = (name: RegExp) => within(menu).getByRole('group', { name });
    expect(within(section(/^money in$/i)).getByRole('link', { name: /side income/i })).toBeInTheDocument();
    expect(within(section(/^money out$/i)).getByRole('link', { name: /spending limits/i })).toBeInTheDocument();
    expect(within(section(/^savings & investments$/i)).getByRole('link', { name: /deposits/i })).toBeInTheDocument();
    expect(within(section(/^debts$/i)).getByRole('link', { name: /loans & emi/i })).toBeInTheDocument();
    expect(within(section(/^debts$/i)).getByRole('link', { name: /credit cards/i })).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: /^home$/i })).toHaveAttribute('aria-current', 'page');
    // every page still has exactly one place in the menu
    const hrefs = within(menu).getAllByRole('link').map((a) => a.getAttribute('href')).filter((h) => h?.startsWith('/dashboard'));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs.sort()).toEqual(['/dashboard', '/dashboard/portfolio', '/dashboard/expenses', '/dashboard/quick-logger', '/dashboard/income',
      '/dashboard/budgets', '/dashboard/bank-accounts', '/dashboard/deposits', '/dashboard/investments', '/dashboard/chit-funds',
      '/dashboard/money-owed-to-me', '/dashboard/loans', '/dashboard/credit-cards', '/dashboard/money-i-borrowed', '/dashboard/goals',
      '/dashboard/projects', '/dashboard/commitments', '/dashboard/vault', '/dashboard/physical-vault', '/dashboard/family'].sort());
    // stage 4: udhaar is split — what you lent is something you own, what you borrowed is a debt; projects are planning
    expect(within(section(/^savings & investments$/i)).getByRole('link', { name: /money others owe you/i })).toHaveAttribute('href', '/dashboard/money-owed-to-me');
    expect(within(section(/^debts$/i)).getByRole('link', { name: /money you borrowed/i })).toHaveAttribute('href', '/dashboard/money-i-borrowed');
    expect(within(section(/^planning$/i)).getByRole('link', { name: /projects/i })).toBeInTheDocument();
    expect(within(section(/^planning$/i)).getByRole('link', { name: /upcoming payments/i })).toBeInTheDocument();
  });

  it('opens Add entry from anywhere', async () => {
    app();
    await userEvent.click(screen.getAllByRole('button', { name: /add entry/i })[0]);
    expect(screen.getByRole('dialog', { name: /add entry/i })).toBeInTheDocument();
  });

  it('marks the open menu as expanded for screen readers', async () => {
    app();
    const btn = screen.getByRole('button', { name: /open menu/i });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(btn);
    expect(screen.getByRole('button', { name: /open menu/i })).toHaveAttribute('aria-expanded', 'true');
  });
});

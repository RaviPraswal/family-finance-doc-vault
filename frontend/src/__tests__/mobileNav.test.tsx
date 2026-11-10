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

  it('marks the open menu as expanded for screen readers', async () => {
    app();
    const btn = screen.getByRole('button', { name: /open menu/i });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(btn);
    expect(screen.getByRole('button', { name: /open menu/i })).toHaveAttribute('aria-expanded', 'true');
  });
});

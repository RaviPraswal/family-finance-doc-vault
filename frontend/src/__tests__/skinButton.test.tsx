import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useThemeStore } from '../store/themeStore';

// Sprint 4 (S4-01): one button names the current look and steps Classic → Liquid Glass → Royal.
describe('Change look button', () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.setState({ skin: 'classic', theme: 'light' });
  });

  it('names the current look and moves to the next one', async () => {
    render(<MemoryRouter><DashboardLayout /></MemoryRouter>);
    const button = screen.getAllByRole('button', { name: /look: classic/i })[0];

    await userEvent.click(button);
    expect(useThemeStore.getState().skin).toBe('liquid');
    await userEvent.click(screen.getAllByRole('button', { name: /look: liquid glass/i })[0]);
    expect(useThemeStore.getState().skin).toBe('royal');
    expect(screen.getAllByRole('button', { name: /look: royal/i }).length).toBeGreaterThan(0);
  });
});

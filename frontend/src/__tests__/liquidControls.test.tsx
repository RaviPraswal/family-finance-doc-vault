import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useThemeStore } from '../store/themeStore';
import { PrimaryAction, ViewToggle, SearchBox, RowActions, ToggleField, GlassPanel } from '../components/ui/LiquidControls';

// glisse (Apple Liquid Glass controls) is used only in the Liquid Glass skin; Classic and Royal keep their controls (D-12).
const opts = [
  { value: 'list', title: 'List view', icon: <svg /> },
  { value: 'card', title: 'Card view', icon: <svg /> },
];

for (const skin of ['liquid', 'classic', 'royal'] as const) {
  describe(`${skin} skin`, () => {
    beforeEach(() => useThemeStore.setState({ skin }));
    const glisse = skin === 'liquid';

    it('primary action is a button with its label; glisse filled button only in Liquid', async () => {
      const onClick = vi.fn();
      render(<PrimaryAction icon={<svg />} onClick={onClick} className="bg-primary">Add account</PrimaryAction>);
      const b = screen.getByRole('button', { name: /add account/i });
      expect(b.classList.contains('lg-button')).toBe(glisse);
      if (glisse) expect(b.dataset.variant).toBe('filled');
      await userEvent.click(b);
      expect(onClick).toHaveBeenCalled();
    });

    it('submit type passes through', () => {
      render(<form><PrimaryAction type="submit">Save</PrimaryAction></form>);
      expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'submit');
    });

    it('view toggle switches views and names each option', async () => {
      const onChange = vi.fn();
      render(<ViewToggle value="list" onChange={onChange} options={opts} />);
      if (glisse) {
        const group = screen.getByRole('radiogroup', { name: 'View' });
        expect(within(group).getByRole('radio', { name: 'List view' })).toHaveAttribute('aria-checked', 'true');
        await userEvent.click(within(group).getByRole('radio', { name: 'Card view' }));
      } else {
        expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(screen.getByRole('button', { name: 'Card view' }));
      }
      expect(onChange).toHaveBeenCalledWith('card');
    });

    it('search box reports typed text', async () => {
      const onChange = vi.fn();
      render(<SearchBox value="" onChange={onChange} placeholder="Search loans" ariaLabel="Search loans" />);
      const box = screen.getByRole(glisse ? 'searchbox' : 'textbox', { name: 'Search loans' });
      await userEvent.type(box, 'a');
      expect(onChange).toHaveBeenCalledWith('a');
    });

    it('row actions: inline buttons in Classic/Royal, a glisse menu in Liquid', async () => {
      const edit = vi.fn(); const del = vi.fn();
      render(<RowActions name="Committee A" actions={[
        { label: 'Edit', ariaLabel: 'Edit Committee A', icon: <svg />, onSelect: edit },
        { label: 'Delete', ariaLabel: 'Delete Committee A', icon: <svg />, onSelect: del, destructive: true },
      ]} />);
      if (glisse) {
        await userEvent.click(screen.getByRole('button', { name: 'Actions for Committee A' }));
        await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));
      } else {
        await userEvent.click(screen.getByRole('button', { name: 'Edit Committee A' }));
      }
      expect(edit).toHaveBeenCalled();
      expect(del).not.toHaveBeenCalled();
    });

    it('toggle field is a switch in Liquid and a checkbox elsewhere', async () => {
      const onChange = vi.fn();
      render(<ToggleField id="t" label="Email alerts" checked={false} onChange={onChange} />);
      await userEvent.click(screen.getByRole(glisse ? 'switch' : 'checkbox', { name: 'Email alerts' }));
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('glass panel is glisse glass only in Liquid', () => {
      render(<GlassPanel data-testid="p" className="fn-sidebar">x</GlassPanel>);
      expect(screen.getByTestId('p').classList.contains('lg-glass')).toBe(glisse);
      expect(screen.getByTestId('p').classList.contains('fn-sidebar')).toBe(true);
    });
  });
}

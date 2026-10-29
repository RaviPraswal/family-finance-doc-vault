import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore, applySkin } from '../store/themeStore';

// The Liquid Glass skin must switch on and off without touching the Classic look or light/dark mode.
describe('Liquid Glass skin switch', () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.setState({ skin: 'classic', theme: 'dark' });
    document.documentElement.className = 'dark';
  });

  it('toggles between classic and liquid and remembers the choice', () => {
    useThemeStore.getState().toggleSkin();
    expect(useThemeStore.getState().skin).toBe('liquid');
    expect(localStorage.getItem('skin')).toBe('liquid');

    useThemeStore.getState().toggleSkin();
    expect(useThemeStore.getState().skin).toBe('classic');
    expect(localStorage.getItem('skin')).toBe('classic');
  });

  it('adds the skin class only for liquid and leaves dark mode alone', () => {
    applySkin('liquid');
    expect(document.documentElement.classList.contains('skin-liquid')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    applySkin('classic');
    expect(document.documentElement.classList.contains('skin-liquid')).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('switching skin does not change light/dark mode', () => {
    useThemeStore.getState().toggleSkin();
    expect(useThemeStore.getState().theme).toBe('dark');
  });
});

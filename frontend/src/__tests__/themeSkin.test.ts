import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore, applySkin, nextSkin, readSkin } from '../store/themeStore';

// The Liquid Glass skin must switch on and off without touching the Classic look or light/dark mode.
describe('Liquid Glass skin switch', () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.setState({ skin: 'classic', theme: 'dark' });
    document.documentElement.className = 'dark';
  });

  it('toggles classic → liquid → royal → classic and remembers the choice', () => {
    useThemeStore.getState().toggleSkin();
    expect(useThemeStore.getState().skin).toBe('liquid');
    expect(localStorage.getItem('skin')).toBe('liquid');

    useThemeStore.getState().toggleSkin();
    expect(useThemeStore.getState().skin).toBe('royal');

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

// Sprint 4 (S4-01): a third skin, Royal (royal blue, purple and magenta glass).
describe('Royal skin', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = 'dark';
  });

  it('switches on only the royal class', () => {
    applySkin('liquid');
    applySkin('royal');
    const cl = document.documentElement.classList;
    expect(cl.contains('skin-royal')).toBe(true);
    expect(cl.contains('skin-liquid')).toBe(false);
    expect(cl.contains('dark')).toBe(true);
  });

  it('cycles classic, liquid, royal and back', () => {
    expect(nextSkin('classic')).toBe('liquid');
    expect(nextSkin('liquid')).toBe('royal');
    expect(nextSkin('royal')).toBe('classic');
  });

  it('remembers royal and ignores unknown saved values', () => {
    useThemeStore.getState().setSkin('royal');
    expect(readSkin()).toBe('royal');
    localStorage.setItem('skin', 'neon');
    expect(readSkin()).toBe('classic');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from '../theme';

describe('Theme Store', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('initializes with dark or system theme', () => {
    const state = useThemeStore.getState();
    expect(state.theme).toBeDefined();
    expect(['dark', 'light', 'system']).toContain(state.theme);
  });

  it('sets theme to light and updates DOM and localStorage', () => {
    useThemeStore.getState().setTheme('light');
    const state = useThemeStore.getState();
    expect(state.theme).toBe('light');
    expect(state.resolvedTheme).toBe('light');
    expect(localStorage.getItem('acme-theme')).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('toggles theme between light and dark', () => {
    useThemeStore.getState().setTheme('light');
    useThemeStore.getState().toggleTheme();
    let state = useThemeStore.getState();
    expect(state.resolvedTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    useThemeStore.getState().toggleTheme();
    state = useThemeStore.getState();
    expect(state.resolvedTheme).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });
});

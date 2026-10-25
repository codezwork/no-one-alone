'use client';
import { useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const saved = localStorage.getItem('neighbours_theme') as ThemeMode | null;
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  return 'system';
}

export function applyTheme(mode: ThemeMode) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const initial = getInitialTheme();
    setThemeState(initial);
    applyTheme(initial);

    const checkDark = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return initial === 'dark' || (initial === 'system' && prefersDark);
    };
    setIsDark(checkDark());

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const current = (localStorage.getItem('neighbours_theme') as ThemeMode) || 'system';
      if (current === 'system') {
        applyTheme('system');
        setIsDark(mediaQuery.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = (mode: ThemeMode) => {
    localStorage.setItem('neighbours_theme', mode);
    setThemeState(mode);
    applyTheme(mode);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(mode === 'dark' || (mode === 'system' && prefersDark));
  };

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
  };

  return { theme, isDark, setTheme, toggleTheme };
}

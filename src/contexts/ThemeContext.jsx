import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'xora-web-theme-mode';

const readStoredMode = () => {
  if (typeof window === 'undefined') return 'auto';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'auto' ? stored : 'auto';
  } catch {
    return 'auto';
  }
};

const getSystemTheme = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const applyTheme = (theme, mode) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.themeMode = mode;
  root.style.colorScheme = theme;
};

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(readStoredMode);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const listener = (event) => setSystemTheme(event.matches ? 'light' : 'dark');
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, []);

  const theme = mode === 'auto' ? systemTheme : mode;

  useEffect(() => {
    applyTheme(theme, mode);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // Ignore storage failures.
      }
    }
  }, [theme, mode]);

  const value = useMemo(() => ({ theme, mode, setMode }), [theme, mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

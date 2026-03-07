'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type ThemeName = 'miami' | 'neutral';
export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeName;
  mode: ThemeMode;
  setTheme: (theme: ThemeName) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'njt-theme';
const MODE_KEY = 'njt-mode';
const DEFAULT_THEME: ThemeName = 'miami';
const DEFAULT_MODE: ThemeMode = 'dark';

function applyToDOM(theme: ThemeName, mode: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.mode = mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as ThemeName | null;
    const savedMode = localStorage.getItem(MODE_KEY) as ThemeMode | null;
    const t = savedTheme === 'miami' || savedTheme === 'neutral' ? savedTheme : DEFAULT_THEME;
    const m = savedMode === 'light' || savedMode === 'dark' ? savedMode : DEFAULT_MODE;
    // Justification: Hydration-safe initialization from localStorage must happen in useEffect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(t);
    setModeState(m);
    applyToDOM(t, m);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyToDOM(theme, mode);
  }, [theme, mode, mounted]);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem(MODE_KEY, m);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(MODE_KEY, next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, mode, setTheme, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Justification: useTheme is a custom hook co-located with its provider by convention
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'bunkmanager_theme';
const DARK_META_COLOR = '#0B0E14';
const LIGHT_META_COLOR = '#F4F5F9';

function apply(theme) {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  } else {
    document.documentElement.removeAttribute('data-theme'); // 'system'
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  const metaTag = document.querySelector('meta[name="theme-color"]');
  if (metaTag) metaTag.setAttribute('content', isDark ? DARK_META_COLOR : LIGHT_META_COLOR);
}

/**
 * localStorage is only an instant-paint cache (see the inline script in
 * index.html) — the database (User.theme) is the source of truth for a
 * logged-in user, so the preference follows them to another device/browser.
 */
export function ThemeProvider({ children }) {
  const { user, setUser } = useAuth();
  const [theme, setThemeState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'system');

  useEffect(() => {
    apply(theme);
  }, [theme]);

  // Re-apply 'system' if the OS-level preference changes while the tab is open.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') apply('system');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // Once the logged-in user's profile loads, the DB value wins over whatever was cached locally.
  useEffect(() => {
    if (user?.theme && user.theme !== theme) {
      localStorage.setItem(STORAGE_KEY, user.theme);
      setThemeState(user.theme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.theme]);

  const setTheme = useCallback(
    async (next) => {
      localStorage.setItem(STORAGE_KEY, next);
      setThemeState(next);
      if (user) {
        try {
          const { user: updated } = await api.updateProfile({ theme: next });
          setUser(updated);
        } catch {
          // Applied locally already — a failed sync just means it won't follow to another device yet.
        }
      }
    },
    [user, setUser]
  );

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

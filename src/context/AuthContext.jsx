import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, clearToken, getToken } from '../api/client';
import { getStoredFcmToken, clearStoredFcmToken } from '../lib/notifications';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    try {
      const { user } = await api.me();
      setUser(user);
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        // The token itself is genuinely rejected (expired/invalid/deactivated) — safe to drop it.
        clearToken();
        setUser(null);
        setLoading(false);
        return;
      }
      // Anything else (no err.status at all = the fetch itself failed —
      // a network error, or a cold-starting free-tier backend timing
      // out) is transient, not proof the token is bad. This is the root
      // cause of "stay signed in" silently failing: reopening the app
      // after it's been idle is exactly when Render's free instance is
      // still waking up, so the very first request would fail and used
      // to wipe out a perfectly valid persisted session over a timing
      // issue. Give the backend a few seconds to wake up and retry once
      // before actually giving up — and even then, keep the token so a
      // manual refresh can still succeed once it's warm.
      await new Promise((resolve) => setTimeout(resolve, 4000));
      try {
        const { user } = await api.me();
        setUser(user);
      } catch (err2) {
        if (err2.status === 401 || err2.status === 403) clearToken();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (identifier, password, staySignedIn = true) => {
    const { token, user } = await api.login({ identifier, password });
    setToken(token, staySignedIn);
    setUser(user);
    return user;
  };

  const signup = async (identifier, password, studentName) => {
    const { token, user } = await api.signup({ identifier, password, studentName });
    setToken(token);
    setUser(user);
    return user;
  };

  const loginWithGoogle = async (credential, staySignedIn = true) => {
    const { token, user } = await api.googleAuth(credential);
    setToken(token, staySignedIn);
    setUser(user);
    return user;
  };

  const logout = async () => {
    try {
      await api.logout(getStoredFcmToken());
    } catch {
      // ignore network errors on logout
    }
    clearStoredFcmToken();
    clearToken();
    setUser(null);
  };

  const refresh = loadMe;

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, signup, loginWithGoogle, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

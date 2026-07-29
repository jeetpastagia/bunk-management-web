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
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (mobileNumber, password, staySignedIn = true) => {
    const { token, user } = await api.login({ mobileNumber, password });
    setToken(token, staySignedIn);
    setUser(user);
    return user;
  };

  const signup = async (mobileNumber, password, studentName) => {
    const { token, user } = await api.signup({ mobileNumber, password, studentName });
    setToken(token);
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
    <AuthContext.Provider value={{ user, setUser, loading, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

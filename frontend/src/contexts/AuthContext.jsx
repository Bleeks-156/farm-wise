import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

const USER_STORAGE_KEY = 'farmwise-user';
const TOKEN_STORAGE_KEY = 'farmwise-token';

function loadUser() {
  try {
    const raw = sessionStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadToken() {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveAuth(user, token) {
  try {
    if (user && token) {
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {}
}

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(loadUser);
  const [token, setToken] = useState(loadToken);
  const [loading, setLoading] = useState(false);

  // Clear old localStorage entries (migrated to sessionStorage)
  useEffect(() => {
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {}
  }, []);

  useEffect(() => {
    saveAuth(user, token);
  }, [user, token]);

  const login = async ({ email, password }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Login failed' };
      }

      setUserState(data.user);
      setToken(data.token);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const register = async ({ name, email, password, phone, location }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, location }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      setUserState(data.user);
      setToken(data.token);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUserState(null);
    setToken(null);
  };

  const isAdmin = user?.role === 'admin';

  const value = useMemo(
    () => ({ user, token, login, logout, register, isAdmin, loading, role: user?.role ?? null }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { AuthApi } from '@/api/services';
import { setAuthFailureHandler } from '@/api/api';
import {
  StoredUser,
  clearSession,
  getRefresh,
  getStoredUser,
  saveSession,
  saveUser,
} from '@/lib/storage';

type AuthState = {
  user: StoredUser | null;
  isGuest: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
  refreshUser: () => Promise<void>;
  setUserLocal: (u: StoredUser) => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  const doLogout = useCallback(async () => {
    const refresh = await getRefresh();
    if (refresh) {
      try {
        await AuthApi.logout(refresh);
      } catch {
        // ignore network/token errors on logout
      }
    }
    await clearSession();
    setUser(null);
    setIsGuest(false);
  }, []);

  useEffect(() => {
    // When a token refresh ultimately fails, drop the session.
    setAuthFailureHandler(() => {
      setUser(null);
      setIsGuest(false);
    });
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await getStoredUser();
      if (stored) setUser(stored);
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await AuthApi.login(email, password);
    await saveSession(data.access, data.refresh, data.user);
    setUser(data.user);
    setIsGuest(false);
  }, []);

  const register = useCallback(async (payload: Record<string, unknown>) => {
    const data = await AuthApi.register(payload);
    await saveSession(data.access, data.refresh, data.user);
    setUser(data.user);
    setIsGuest(false);
  }, []);

  const continueAsGuest = useCallback(() => {
    setIsGuest(true);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const fresh = await AuthApi.me();
    await saveUser(fresh);
    setUser(fresh);
  }, []);

  const setUserLocal = useCallback(async (u: StoredUser) => {
    await saveUser(u);
    setUser(u);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isGuest,
      loading,
      login,
      register,
      logout: doLogout,
      continueAsGuest,
      refreshUser,
      setUserLocal,
    }),
    [user, isGuest, loading, login, register, doLogout, continueAsGuest, refreshUser, setUserLocal],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

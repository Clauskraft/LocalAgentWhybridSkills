/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ApiClient } from "../lib/api";
import { clearTokens, loadTokens, saveTokens, type StoredTokens } from "../lib/tokenStore";

type AuthUser = { id: string; email: string };

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  api: ApiClient;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  bootstrap: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider(props: { children: React.ReactNode }) {
  const initialTokens = loadTokens();
  const api = useMemo(() => {
    const client = new ApiClient(
      initialTokens
        ? { accessToken: initialTokens.accessToken, refreshToken: initialTokens.refreshToken, expiresAt: initialTokens.expiresAt }
        : null
    );
    return client;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const persistTokens = useCallback((tokens: StoredTokens | null) => {
    if (!tokens) {
      clearTokens();
      api.setTokens(null);
      return;
    }
    saveTokens(tokens);
    api.setTokens(tokens);
  }, [api]);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stored = loadTokens();
      if (!stored) {
        setUser(null);
        return;
      }
      api.setTokens(stored);
      // Try me(); if it 401s, refresh() then retry.
      try {
        const me = await api.me();
        setUser(me);
      } catch (e) {
        const status = (e as Error & { status?: number }).status;
        if (status === 401) {
          await api.refresh();
          const t = api.getTokens();
          if (t) persistTokens(t);
          const me = await api.me();
          setUser(me);
        } else {
          throw e;
        }
      }
    } catch (e) {
      setUser(null);
      setError(e instanceof Error ? e.message : "auth_bootstrap_failed");
      clearTokens();
      api.setTokens(null);
    } finally {
      setLoading(false);
    }
  }, [api, persistTokens]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.login(email, password);
      const t = api.getTokens();
      if (t) persistTokens(t);
      const me = await api.me();
      setUser(me);
    } catch (e) {
      setError(e instanceof Error ? e.message : "login_failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, [api, persistTokens]);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.register(email, password, displayName);
      const t = api.getTokens();
      if (t) persistTokens(t);
      const me = await api.me();
      setUser(me);
    } catch (e) {
      setError(e instanceof Error ? e.message : "register_failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, [api, persistTokens]);

  const logout = useCallback(() => {
    persistTokens(null);
    setUser(null);
    setError(null);
  }, [persistTokens]);

  const value: AuthState = useMemo(
    () => ({ user, loading, error, api, login, register, logout, bootstrap }),
    [user, loading, error, api, login, register, logout, bootstrap]
  );
  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("AuthContext missing");
  return v;
}



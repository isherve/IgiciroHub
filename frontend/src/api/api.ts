import axios, { AxiosError, AxiosRequestConfig } from 'axios';

import { API_BASE } from '@/config';
import { clearSession, getAccess, getRefresh, saveTokens } from '@/lib/storage';

/**
 * Centralized Axios client. Interceptors:
 *   - attach the JWT access token to every request
 *   - on 401, try a single refresh using the stored refresh token, then retry
 */
export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Called when refresh fails so the app can route back to login.
let onAuthFailure: (() => void) | null = null;
export function setAuthFailureHandler(fn: () => void) {
  onAuthFailure = fn;
}

api.interceptors.request.use(async (config) => {
  const token = await getAccess();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccess(): Promise<string | null> {
  const refresh = await getRefresh();
  if (!refresh) return null;
  try {
    const resp = await axios.post(`${API_BASE}/auth/refresh/`, { refresh });
    const newAccess: string = resp.data.access;
    const newRefresh: string = resp.data.refresh ?? refresh;
    await saveTokens(newAccess, newRefresh);
    return newAccess;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry) {
      original._retry = true;
      refreshing = refreshing ?? refreshAccess();
      const newAccess = await refreshing;
      refreshing = null;

      if (newAccess) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${newAccess}`;
        return api(original);
      }
      await clearSession();
      onAuthFailure?.();
    }
    return Promise.reject(error);
  },
);

/** Extract a human-readable error message from a DRF error response. */
export function apiError(err: unknown, fallback = 'Something went wrong'): string {
  const e = err as AxiosError<any>;
  const data = e?.response?.data;
  if (!data) return e?.message ?? fallback;
  if (typeof data === 'string') return data;
  if (data.detail) return String(data.detail);
  // Field errors -> first message.
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const v = data[firstKey];
    return Array.isArray(v) ? `${firstKey}: ${v[0]}` : `${firstKey}: ${v}`;
  }
  return fallback;
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS = 'igh.access';
const REFRESH = 'igh.refresh';
const USER = 'igh.user';
const GUEST = 'igh.guest';

export type StoredUser = {
  id: number;
  full_name: string;
  email: string;
  role: 'cooperative' | 'buyer' | 'admin';
  phone_number?: string;
  locale?: string;
  notify_in_app?: boolean;
  notify_email?: boolean;
  notify_sms?: boolean;
};

function webSession(): Storage | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return window.sessionStorage;
}

/** Web auth uses sessionStorage so each new visit starts at login. */
function useWebSessionForAuth() {
  return Platform.OS === 'web';
}

async function setSecure(key: string, value: string) {
  const session = webSession();
  if (useWebSessionForAuth() && session) {
    session.setItem(key, value);
    return;
  }
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getSecure(key: string) {
  const session = webSession();
  if (useWebSessionForAuth() && session) {
    return session.getItem(key);
  }
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function removeSecure(key: string) {
  const session = webSession();
  if (useWebSessionForAuth() && session) {
    session.removeItem(key);
  }
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

async function setAuthFlag(key: string, value: string) {
  const session = webSession();
  if (useWebSessionForAuth() && session) {
    session.setItem(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

async function getAuthFlag(key: string): Promise<string | null> {
  const session = webSession();
  if (useWebSessionForAuth() && session) {
    return session.getItem(key);
  }
  return AsyncStorage.getItem(key);
}

async function removeAuthFlag(key: string) {
  const session = webSession();
  if (useWebSessionForAuth() && session) {
    session.removeItem(key);
  }
  await AsyncStorage.removeItem(key);
}

/** Drop old localStorage sessions from before web used sessionStorage. */
export async function clearLegacyWebAuth() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const keys = [ACCESS, REFRESH, USER, GUEST];
  keys.forEach((k) => {
    window.localStorage.removeItem(k);
    window.localStorage.removeItem(`@RNCAsyncStorage:${k}`);
  });
  await AsyncStorage.multiRemove(keys);
}

export async function saveSession(access: string, refresh: string, user: StoredUser) {
  await setSecure(ACCESS, access);
  await setSecure(REFRESH, refresh);
  await setAuthFlag(USER, JSON.stringify(user));
}

export async function saveTokens(access: string, refresh: string) {
  await setSecure(ACCESS, access);
  await setSecure(REFRESH, refresh);
}

export async function saveUser(user: StoredUser) {
  await setAuthFlag(USER, JSON.stringify(user));
}

export async function getAccess() {
  return getSecure(ACCESS);
}

export async function getRefresh() {
  return getSecure(REFRESH);
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const raw = await getAuthFlag(USER);
  return raw ? (JSON.parse(raw) as StoredUser) : null;
}

export async function clearSession() {
  await Promise.all([removeSecure(ACCESS), removeSecure(REFRESH), removeAuthFlag(USER)]);
}

export async function setGuestMode(on: boolean) {
  if (on) await setAuthFlag(GUEST, '1');
  else await removeAuthFlag(GUEST);
}

export async function getGuestMode(): Promise<boolean> {
  return (await getAuthFlag(GUEST)) === '1';
}

// Generic cache helpers for offline mode (non-sensitive).
export async function cacheSet(key: string, value: unknown) {
  await AsyncStorage.setItem(`igh.cache.${key}`, JSON.stringify({ ts: Date.now(), value }));
}

export async function cacheGet<T>(key: string): Promise<{ ts: number; value: T } | null> {
  const raw = await AsyncStorage.getItem(`igh.cache.${key}`);
  return raw ? (JSON.parse(raw) as { ts: number; value: T }) : null;
}

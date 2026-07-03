import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS = 'igh.access';
const REFRESH = 'igh.refresh';
const USER = 'igh.user';

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

export async function saveSession(access: string, refresh: string, user: StoredUser) {
  await AsyncStorage.multiSet([
    [ACCESS, access],
    [REFRESH, refresh],
    [USER, JSON.stringify(user)],
  ]);
}

export async function saveTokens(access: string, refresh: string) {
  await AsyncStorage.multiSet([
    [ACCESS, access],
    [REFRESH, refresh],
  ]);
}

export async function saveUser(user: StoredUser) {
  await AsyncStorage.setItem(USER, JSON.stringify(user));
}

export async function getAccess() {
  return AsyncStorage.getItem(ACCESS);
}

export async function getRefresh() {
  return AsyncStorage.getItem(REFRESH);
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const raw = await AsyncStorage.getItem(USER);
  return raw ? (JSON.parse(raw) as StoredUser) : null;
}

export async function clearSession() {
  await AsyncStorage.multiRemove([ACCESS, REFRESH, USER]);
}

// Generic cache helpers for offline mode.
export async function cacheSet(key: string, value: unknown) {
  await AsyncStorage.setItem(`igh.cache.${key}`, JSON.stringify({ ts: Date.now(), value }));
}

export async function cacheGet<T>(key: string): Promise<{ ts: number; value: T } | null> {
  const raw = await AsyncStorage.getItem(`igh.cache.${key}`);
  return raw ? (JSON.parse(raw) as { ts: number; value: T }) : null;
}

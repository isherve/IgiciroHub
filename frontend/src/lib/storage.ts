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

async function setSecure(key: string, value: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getSecure(key: string) {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function removeSecure(key: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export async function saveSession(access: string, refresh: string, user: StoredUser) {
  await setSecure(ACCESS, access);
  await setSecure(REFRESH, refresh);
  await AsyncStorage.setItem(USER, JSON.stringify(user));
}

export async function saveTokens(access: string, refresh: string) {
  await setSecure(ACCESS, access);
  await setSecure(REFRESH, refresh);
}

export async function saveUser(user: StoredUser) {
  await AsyncStorage.setItem(USER, JSON.stringify(user));
}

export async function getAccess() {
  return getSecure(ACCESS);
}

export async function getRefresh() {
  return getSecure(REFRESH);
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const raw = await AsyncStorage.getItem(USER);
  return raw ? (JSON.parse(raw) as StoredUser) : null;
}

export async function clearSession() {
  await Promise.all([removeSecure(ACCESS), removeSecure(REFRESH), AsyncStorage.removeItem(USER)]);
}

export async function setGuestMode(on: boolean) {
  if (on) await AsyncStorage.setItem(GUEST, '1');
  else await AsyncStorage.removeItem(GUEST);
}

export async function getGuestMode(): Promise<boolean> {
  return (await AsyncStorage.getItem(GUEST)) === '1';
}

// Generic cache helpers for offline mode (non-sensitive).
export async function cacheSet(key: string, value: unknown) {
  await AsyncStorage.setItem(`igh.cache.${key}`, JSON.stringify({ ts: Date.now(), value }));
}

export async function cacheGet<T>(key: string): Promise<{ ts: number; value: T } | null> {
  const raw = await AsyncStorage.getItem(`igh.cache.${key}`);
  return raw ? (JSON.parse(raw) as { ts: number; value: T }) : null;
}

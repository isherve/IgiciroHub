import { Platform } from 'react-native';

/**
 * Base URL of the Django backend.
 *
 * Override for a physical device / LAN by setting EXPO_PUBLIC_API_URL in a
 * `.env` file, e.g. EXPO_PUBLIC_API_URL=http://192.168.1.20:8000
 *
 * Defaults:
 *   - Android emulator: 10.0.2.2 maps to the host machine's localhost
 *   - iOS simulator / web: 127.0.0.1
 */
const fallback = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? fallback;
export const API_BASE = `${API_URL}/api`;

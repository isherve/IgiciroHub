import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en';
import fr from './locales/fr';
import rw from './locales/rw';

const LANG_KEY = 'igh.lang';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'rw', label: 'Kinyarwanda' },
  { code: 'fr', label: 'Français' },
];

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    en: { translation: en },
    rw: { translation: rw },
    fr: { translation: fr },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export async function loadStoredLanguage() {
  const stored = await AsyncStorage.getItem(LANG_KEY);
  if (stored) await i18n.changeLanguage(stored);
}

export async function setLanguage(code: string) {
  await i18n.changeLanguage(code);
  await AsyncStorage.setItem(LANG_KEY, code);
}

export default i18n;

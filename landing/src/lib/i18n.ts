import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import lt from '@/locales/lt.json';

export type Locale = 'lt' | 'en';
export const locales: readonly Locale[] = ['lt', 'en'];

export const resources = { en: { translation: en }, lt: { translation: lt } } as const;

export function isLocale(value: unknown): value is Locale {
  return value === 'lt' || value === 'en';
}

/** Lithuanian when the browser asks for it first, otherwise English. */
export function browserLocale(languages: readonly string[] = navigator.languages): Locale {
  return languages[0]?.toLowerCase().startsWith('lt') ? 'lt' : 'en';
}

export const i18n = createInstance();

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: locales,
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
});

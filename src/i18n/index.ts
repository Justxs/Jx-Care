import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import lt from './lt.json';

export type Language = 'lt' | 'en';
export const languages: readonly Language[] = ['lt', 'en'];

export const resources = { en: { translation: en }, lt: { translation: lt } } as const;

/** The phone's language if it is Lithuanian, otherwise English. */
export function phoneLanguage(): Language {
  try {
    return getLocales()[0]?.languageCode === 'lt' ? 'lt' : 'en';
  } catch {
    return 'en';
  }
}

export function isLanguage(value: unknown): value is Language {
  return value === 'lt' || value === 'en';
}

const i18n = createInstance();

i18n.use(initReactI18next).init({
  resources,
  lng: phoneLanguage(),
  fallbackLng: 'en',
  supportedLngs: ['lt', 'en'],
  interpolation: { escapeValue: false },
  returnNull: false,
  saveMissing: __DEV__,
  missingKeyHandler: (_lngs, _ns, key) => {
    if (__DEV__) console.warn(`[i18n] missing key: ${key}`);
  },
  initAsync: false,
});

/** Changes the language at once; mounted screens re-render through react-i18next. */
export function setI18nLanguage(lang: Language): Promise<unknown> {
  if (i18n.language === lang) return Promise.resolve();
  return i18n.changeLanguage(lang);
}

export { i18n };
export default i18n;

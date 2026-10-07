import { createStore, useSelector } from '@tanstack/react-store';

import { browserLocale, i18n, isLocale, type Locale } from '@/lib/i18n';

export type Theme = 'light' | 'dark';

export interface Preferences {
  locale: Locale;
  /** null follows the system theme until the visitor picks one. */
  theme: Theme | null;
}

const storageKey = 'jx-care-landing';

function readSaved(): Partial<Preferences> {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
    if (typeof saved !== 'object' || saved === null) return {};
    const { locale, theme } = saved as Record<string, unknown>;
    return {
      locale: isLocale(locale) ? locale : undefined,
      theme: theme === 'light' || theme === 'dark' ? theme : undefined,
    };
  } catch {
    return {};
  }
}

function initialPreferences(): Preferences {
  const saved = readSaved();
  return { locale: saved.locale ?? browserLocale(), theme: saved.theme ?? null };
}

export const preferencesStore = createStore<Preferences>(initialPreferences());

/** Applies the preferences to the page: html lang and theme class, i18next and the description. */
function apply({ locale, theme }: Preferences) {
  const root = document.documentElement;
  root.lang = locale;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  if (i18n.language !== locale) void i18n.changeLanguage(locale);
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', i18n.t('meta.description'));
}

apply(preferencesStore.state);

preferencesStore.subscribe((next) => {
  apply(next);
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Private windows can refuse storage; the choice then lasts until the tab closes.
  }
});

/** Changes the page with a cross-fade where the browser supports view transitions. */
function withTransition(change: () => void) {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  if (!document.startViewTransition || reduced || document.hidden) {
    change();
    return;
  }
  // The browser can still skip the transition (the tab hides mid-way); `ready` then rejects,
  // but the change itself has already run.
  document.startViewTransition(change).ready.catch(() => {});
}

export function setLocale(locale: Locale) {
  withTransition(() => preferencesStore.setState((prev) => ({ ...prev, locale })));
}

export function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function toggleTheme() {
  withTransition(() =>
    preferencesStore.setState((prev) => ({
      ...prev,
      theme: (prev.theme ?? systemTheme()) === 'dark' ? 'light' : 'dark',
    })),
  );
}

export function useLocale(): Locale {
  return useSelector(preferencesStore, (state) => state.locale);
}

export function useTheme(): Theme | null {
  return useSelector(preferencesStore, (state) => state.theme);
}

export { storageKey as preferencesStorageKey };

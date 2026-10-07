import { createStore } from '@tanstack/react-store';
import { AppState as RNAppState } from 'react-native';

import { getDb } from '@/db';
import { queryClient } from '@/db/queryClient';
import { qk } from '@/db/queryKeys';
import { hasSettingsRow, saveSettings } from '@/features/settings/repo';
import { phoneLanguage, setI18nLanguage, type Language } from '@/i18n';
import { appDay, nextDayBoundary } from '@/lib/appDay';

export type AppStoreState = {
  language: Language;
  /** Fonts loaded and database migrated. */
  isReady: boolean;
  /** The current app day ('YYYY-MM-DD', ends at 04:00). */
  activeDay: string;
};

export const appStore = createStore<AppStoreState>({
  language: phoneLanguage(),
  isReady: false,
  activeDay: appDay(Date.now()),
});

export function setReady(isReady: boolean): void {
  appStore.setState((s) => ({ ...s, isReady }));
}

/**
 * Changes the language everywhere at once: the store, i18next (mounted screens re-render) and,
 * once onboarding has created it, the settings row, so it survives a restart.
 */
export async function setLanguage(lang: Language, opts: { persist?: boolean } = {}): Promise<void> {
  appStore.setState((s) => ({ ...s, language: lang }));
  await setI18nLanguage(lang);
  if (opts.persist === false) return;
  const db = getDb();
  if (hasSettingsRow(db)) {
    const next = saveSettings(db, { language: lang });
    queryClient.setQueryData(qk.settings, next);
  }
}

/** Updates `activeDay` if the app day has changed; returns the current day. */
export function refreshActiveDay(now: number = Date.now()): string {
  const day = appDay(now);
  if (appStore.state.activeDay !== day) {
    appStore.setState((s) => ({ ...s, activeDay: day }));
  }
  return day;
}

/**
 * Keeps `activeDay` current: a timer for the next 04:00 and a refresh whenever the app comes to
 * the foreground. Returns a stop function.
 */
export function startDayClock(now: () => number = Date.now): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    clearTimeout(timer);
    const t = now();
    timer = setTimeout(
      () => {
        refreshActiveDay(now());
        schedule();
      },
      Math.max(1000, nextDayBoundary(t) - t),
    );
  };
  refreshActiveDay(now());
  schedule();
  const sub = RNAppState.addEventListener('change', (state) => {
    if (state === 'active') {
      refreshActiveDay(now());
      schedule();
    }
  });
  return () => {
    clearTimeout(timer);
    sub.remove();
  };
}

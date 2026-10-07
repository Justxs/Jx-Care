import { getDb } from '@/db';
import { queryClient } from '@/db/queryClient';
import { qk } from '@/db/queryKeys';
import { getSettings, hasSettingsRow } from '@/features/settings/repo';
import { prefetchToday } from '@/features/today/prefetch';
import { phoneLanguage } from '@/i18n';

import { appStore, setLanguage, setReady } from './app';

/**
 * Runs once the database is migrated: applies saved settings, prefetches Today (so it paints
 * complete on its first frame) and marks the app ready.
 */
export async function bootstrapAfterMigrations(): Promise<void> {
  const db = getDb();
  const settings = getSettings(db, phoneLanguage());
  queryClient.setQueryData(qk.settings, settings);
  if (hasSettingsRow(db)) {
    await setLanguage(settings.language, { persist: false });
    await prefetchToday(queryClient, appStore.state.activeDay).catch(() => {});
  }
  setReady(true);
}

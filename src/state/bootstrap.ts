import { getDb } from '@/db';
import { queryClient } from '@/db/queryClient';
import { qk } from '@/db/queryKeys';
import { getSettings, hasSettingsRow } from '@/features/settings/repo';
import { phoneLanguage } from '@/i18n';

import { setLanguage, setReady } from './app';

/** Runs once the database is migrated: applies saved settings and marks the app ready. */
export async function bootstrapAfterMigrations(): Promise<void> {
  const db = getDb();
  const settings = getSettings(db, phoneLanguage());
  queryClient.setQueryData(qk.settings, settings);
  if (hasSettingsRow(db)) await setLanguage(settings.language, { persist: false });
  setReady(true);
}

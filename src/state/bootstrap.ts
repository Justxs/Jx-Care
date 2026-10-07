import { getDb } from '@/db';
import { queryClient } from '@/db/queryClient';
import { qk } from '@/db/queryKeys';
import { seedDefaultRules } from '@/features/conflicts/seed';
import { checkOnboarding } from '@/features/onboarding/gate';
import { getSettings, hasSettingsRow } from '@/features/settings/repo';
import { purgeOldBought } from '@/features/shopping/repo';
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
  // Bought shopping items leave the list 30 days after they were ticked.
  purgeOldBought(db, Date.now());
  if (hasSettingsRow(db)) {
    await setLanguage(settings.language, { persist: false });
    // Installs from before the default conflict rules get them once (a no-op afterwards).
    try {
      seedDefaultRules(db, settings.language);
    } catch {
      // Never blocks the launch; the next launch tries again.
    }
    await prefetchToday(queryClient, appStore.state.activeDay).catch(() => {});
  }
  // First launch or a missing PIN: onboarding (wipes secure keys left by an old install).
  await checkOnboarding(db);
  setReady(true);
}

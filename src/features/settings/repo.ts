/**
 * Settings repository, and the pattern every repo.ts follows:
 *
 * - Plain functions; the first argument is the database (`db: Db`). No React, no Query.
 *   Synchronous Drizzle calls (`.get()`, `.all()`, `.run()`) work on both expo-sqlite and
 *   better-sqlite3, so the same code runs in the app and in Jest.
 * - Writes that touch several tables run inside `db.transaction((tx) => …)`.
 * - Each repo has a `repo.test.ts` next to it using `createTestDb()`.
 */
import { eq } from 'drizzle-orm';

import type { Db } from '@/db';
import { settings, type Settings } from '@/db/schema';

export const SETTINGS_ID = 1;

export type AppSettings = Omit<Settings, 'id' | 'createdAt' | 'updatedAt'>;
export type SettingsPatch = Partial<AppSettings>;

/** The defaults from the schema, used until onboarding creates the row. */
export const defaultSettings: AppSettings = {
  language: 'en',
  currency: 'EUR',
  expiryWarnDays: 30,
  expiryReminderTime: '09:00',
  expiryRemindersOn: false,
  expiryDayReminderOn: true,
  routineRemindersOn: true,
  hairRemindersOn: true,
  weeklyPhotoOn: false,
  weeklyPhotoWeekday: 7,
  weeklyPhotoTime: '10:00',
  weeklyDigestOn: true,
  snoozeMinutes: 15,
  autoLockSeconds: 60,
  biometricsOn: false,
  skinAngles: ['front'],
  hairAlbumOn: false,
  hairAngles: ['front', 'back', 'top'],
  photoGuideOn: true,
  photoGuideOpacity: 0.3,
  reminderAskDone: false,
  setupDoneAt: null,
  setupHiddenAt: null,
  lastBackupAt: null,
  productView: 'list',
  commonRulesVersion: 0,
};

function strip(row: Settings): AppSettings {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = row;
  return rest;
}

/** The settings row, or the defaults when it doesn't exist yet. */
export function getSettings(db: Db, fallbackLanguage: AppSettings['language'] = 'en'): AppSettings {
  const row = db.select().from(settings).where(eq(settings.id, SETTINGS_ID)).get();
  return row ? strip(row) : { ...defaultSettings, language: fallbackLanguage };
}

export function hasSettingsRow(db: Db): boolean {
  return (
    db.select({ id: settings.id }).from(settings).where(eq(settings.id, SETTINGS_ID)).get() !==
    undefined
  );
}

/** Upserts the single settings row and returns the result. */
export function saveSettings(db: Db, patch: SettingsPatch): AppSettings {
  const existing = db.select().from(settings).where(eq(settings.id, SETTINGS_ID)).get();
  if (existing) {
    if (Object.keys(patch).length > 0) {
      db.update(settings).set(patch).where(eq(settings.id, SETTINGS_ID)).run();
    }
  } else {
    db.insert(settings)
      .values({ ...defaultSettings, ...patch, id: SETTINGS_ID })
      .run();
  }
  return getSettings(db);
}

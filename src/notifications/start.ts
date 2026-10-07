/**
 * Wires the notification layer into the running app (called once from app/_layout.tsx after
 * boot): channels and categories, taps, the background tasks, and every moment `sync` runs.
 */
import { hashKey, type QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

import { queryClient as appQueryClient } from '@/db/queryClient';
import { qk } from '@/db/queryKeys';
import type { AppSettings } from '@/features/settings/repo';
import { i18n } from '@/i18n';
import { appStore } from '@/state/app';
import { lockStore } from '@/state/lock';

import { startResponseHandling } from './responses';
import { getNotificationOS, sync } from './scheduler';
import { setupNotifications } from './setup';
import type { PermissionState } from './types';

/** Settings that change what is planned; a change to any of them re-syncs (language: below). */
const plannedSettings = [
  'expiryWarnDays',
  'expiryReminderTime',
  'expiryRemindersOn',
  'expiryDayReminderOn',
  'routineRemindersOn',
  'hairRemindersOn',
  'weeklyPhotoOn',
  'weeklyPhotoWeekday',
  'weeklyPhotoTime',
  // The weekly photo text names hair photos too while the hair album is on (task 036).
  'hairAlbumOn',
  'weeklyDigestOn',
  'lastBackupAt',
] as const satisfies readonly (keyof AppSettings)[];

export function plannedSettingsSignature(s: AppSettings | undefined): string {
  return s ? JSON.stringify(plannedSettings.map((k) => s[k])) : '';
}

function runSync(reconcile = false): void {
  sync(Date.now(), { reconcile }).catch((error) => {
    if (__DEV__) console.warn('[notifications] sync failed', error);
  });
}

function runSetup(): void {
  setupNotifications(i18n.getFixedT(appStore.state.language)).catch(() => {});
}

/**
 * Starts everything; the OS adapter must already be set (`setNotificationOS`). Returns a stop
 * function.
 */
export function startNotifications(opts: { queryClient?: QueryClient } = {}): () => void {
  const client = opts.queryClient ?? appQueryClient;
  const stops: (() => void)[] = [];

  runSetup();
  stops.push(startResponseHandling());
  // Every app open, comparing with what the phone has pending.
  runSync(true);

  // Language: rename channels and buttons, and re-plan the text. A new app day (foreground on a
  // new day, or the 04:00 timer): top up the window.
  let { language, activeDay } = appStore.state;
  const appSub = appStore.subscribe((s) => {
    if (s.language !== language) {
      language = s.language;
      runSetup();
      runSync();
    }
    if (s.activeDay !== activeDay) {
      activeDay = s.activeDay;
      runSync(true);
    }
  });
  stops.push(() => appSub.unsubscribe());

  // Unlock is an app open too.
  let locked = lockStore.state.locked;
  const lockSub = lockStore.subscribe((s) => {
    if (locked && !s.locked) runSync();
    locked = s.locked;
  });
  stops.push(() => lockSub.unsubscribe());

  // Reminder settings saved anywhere (the settings query is updated after every save).
  const settingsHash = hashKey(qk.settings);
  let signature = plannedSettingsSignature(client.getQueryData<AppSettings>(qk.settings));
  stops.push(
    client.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.query.queryHash !== settingsHash) return;
      const next = plannedSettingsSignature(event.query.state.data as AppSettings | undefined);
      if (next && next !== signature) {
        signature = next;
        runSync();
      }
    }),
  );

  // Permission changed in phone settings while away: sync (schedules everything, or cancels it).
  let permission: PermissionState | null = null;
  const checkPermission = async () => {
    const next = await getNotificationOS().getPermission();
    client.setQueryData(qk.notifications.permission, next);
    if (permission !== null && next !== permission) runSync(true);
    permission = next;
  };
  checkPermission().catch(() => {});
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') checkPermission().catch(() => {});
  });
  stops.push(() => appState.remove());

  return () => {
    for (const stop of stops) stop();
  };
}

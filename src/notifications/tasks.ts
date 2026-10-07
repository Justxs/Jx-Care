/**
 * Background work. Defined at module scope (imported by app/_layout.tsx) because the OS can start
 * the JS bundle without any screen just to run these:
 *
 * - a daily sync (expo-background-task, at least 24 h apart) so reminders keep flowing when the
 *   app isn't opened;
 * - action buttons tapped while the app is closed (Android runs them headless).
 */
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { getDb, setDb } from '@/db';

import { expoNotificationOS } from './os';
import { handleResponse } from './responses';
import { setNotificationOS, sync } from './scheduler';

// Every module that calls `registerPlanner` or `registerAction` is imported here, so planners and
// button handlers exist in the app and in a headless start alike (which loads this file, not the
// screens). One line per feature:
import '@/features/products/reminders'; // task 021: expiry and weekly digest

export const SYNC_TASK = 'jx-care-notification-sync';
export const RESPONSE_TASK = 'jx-care-notification-response';
/** Minutes, as expo-background-task expects. */
export const SYNC_INTERVAL_MINUTES = 24 * 60;

/** A headless start has no root layout, so the database and the OS adapter are set here. */
async function ensureReady(): Promise<void> {
  try {
    getDb();
  } catch {
    const { appDb } = await import('@/db/client');
    setDb(appDb);
  }
  setNotificationOS(expoNotificationOS);
}

TaskManager.defineTask(SYNC_TASK, async () => {
  try {
    await ensureReady();
    await sync(Date.now(), { reconcile: true });
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

TaskManager.defineTask<Notifications.NotificationTaskPayload>(RESPONSE_TASK, async ({ data }) => {
  if (data && 'actionIdentifier' in data) {
    try {
      await ensureReady();
      await handleResponse(data, { background: true });
    } catch {
      return Notifications.BackgroundNotificationTaskResult.Failed;
    }
  }
  return Notifications.BackgroundNotificationTaskResult.NoData;
});

/** Registers both tasks with the OS; safe to call on every start. */
export async function registerBackgroundTasks(): Promise<void> {
  await Notifications.registerTaskAsync(RESPONSE_TASK).catch(() => {});
  const status = await BackgroundTask.getStatusAsync();
  if (status === BackgroundTask.BackgroundTaskStatus.Available) {
    await BackgroundTask.registerTaskAsync(SYNC_TASK, { minimumInterval: SYNC_INTERVAL_MINUTES });
  }
}

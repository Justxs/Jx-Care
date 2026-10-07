/**
 * Taps and action buttons. A tap opens `data.url` (behind the lock if it is up); an action button
 * runs the handler a feature registered with `registerAction`, without opening the app where the
 * OS allows it.
 */
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';

import { getDb, type Db } from '@/db';
import { notificationEntityTypes, notificationKinds } from '@/db/enums';
import { getSettings, type AppSettings } from '@/features/settings/repo';
import { lockStore, setPendingUrl, takePendingUrl } from '@/state/lock';

import { scheduleSnooze, type SnoozeSource } from './scheduler';
import {
  categoryIds,
  channelIds,
  type ActionId,
  type CategoryId,
  type NotificationData,
} from './types';

export type ActionContext = SnoozeSource & {
  actionId: ActionId;
  now: number;
  db: Db;
  settings: AppSettings;
};

export type ActionHandler = (ctx: ActionContext) => void | Promise<void>;

const handlers = new Map<string, ActionHandler>();

/** Features say what a button does: `registerAction('expiry_day', 'mark_finished', handler)`. */
export function registerAction(
  categoryId: CategoryId,
  actionId: ActionId,
  handler: ActionHandler,
): void {
  handlers.set(`${categoryId}:${actionId}`, handler);
}

export function unregisterAction(categoryId: CategoryId, actionId: ActionId): void {
  handlers.delete(`${categoryId}:${actionId}`);
}

/** Snooze: a one-off copy after `settings.snoozeMinutes` (5 / 15 / 30). */
export const snoozeHandler: ActionHandler = async (ctx) => {
  await scheduleSnooze(ctx, ctx.settings.snoozeMinutes, ctx.now);
};

registerAction('routine', 'snooze', snoozeHandler);
registerAction('hair', 'snooze', snoozeHandler);

// ---------------------------------------------------------------------------------------------

let navigate: (url: string) => void = (url) => router.push(url as Href);

/** Tests replace the router. */
export function setNavigator(next: (url: string) => void): void {
  navigate = next;
}

/** Opens a notification's screen now, or right after unlock while the lock is up. */
export function openUrl(url: string): void {
  if (lockStore.state.locked) setPendingUrl(url);
  else navigate(url);
}

/**
 * Called by the lock gate (task 018) right after unlock: opens the screen of a notification
 * tapped while locked. Returns whether there was one.
 */
export function openPendingUrl(): boolean {
  const url = takePendingUrl();
  if (url === null) return false;
  navigate(url);
  return true;
}

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

/** The data we put on every notification, or null for anything else. */
export function readData(raw: unknown): NotificationData | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.url !== 'string' || !d.url.startsWith('/') || typeof d.key !== 'string') return null;
  if (!isOneOf(notificationEntityTypes, d.entityType) || !isOneOf(notificationKinds, d.kind)) {
    return null;
  }
  const entityId = typeof d.entityId === 'number' ? d.entityId : null;
  const channelId = isOneOf(channelIds, d.channelId) ? d.channelId : 'digest';
  return { url: d.url, key: d.key, entityType: d.entityType, entityId, kind: d.kind, channelId };
}

/** Responses already handled; the listener and the cold-start lookup can both see one. */
const handled = new Set<string>();

function responseId(r: Notifications.NotificationResponse): string {
  return `${r.notification.request.identifier}@${r.notification.date}:${r.actionIdentifier}`;
}

/**
 * Handles a tap or an action button. `background` is true in the headless task (Android action
 * buttons while the app is closed), where taps are left to the app that opens.
 */
export async function handleResponse(
  response: Notifications.NotificationResponse,
  opts: { background?: boolean; now?: number } = {},
): Promise<void> {
  const id = responseId(response);
  if (handled.has(id)) return;
  const content = response.notification.request.content;
  const data = readData(content.data);
  if (!data) return;
  const action = response.actionIdentifier;
  const isTap = action === Notifications.DEFAULT_ACTION_IDENTIFIER;
  if (isTap && opts.background) return;
  handled.add(id);

  if (isTap) {
    openUrl(data.url);
    return;
  }
  const categoryId = isOneOf(categoryIds, content.categoryIdentifier)
    ? content.categoryIdentifier
    : undefined;
  const handler = categoryId ? handlers.get(`${categoryId}:${action}`) : undefined;
  if (!handler) {
    // A button whose feature isn't built yet opens the notification's screen instead.
    openUrl(data.url);
    return;
  }
  const db = getDb();
  await handler({
    actionId: action as ActionId,
    data,
    title: content.title ?? '',
    body: content.body ?? '',
    categoryId,
    channelId: data.channelId,
    now: opts.now ?? Date.now(),
    db,
    settings: getSettings(db),
  });
  await Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(
    () => {},
  );
}

/**
 * Listens for taps and buttons while the app runs, and handles the tap that cold-started it.
 * Returns a stop function.
 */
export function startResponseHandling(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    handleResponse(r).catch(() => {});
  });
  Notifications.getLastNotificationResponseAsync()
    .then(async (r) => {
      if (!r) return;
      await handleResponse(r);
      await Notifications.clearLastNotificationResponseAsync();
    })
    .catch(() => {});
  return () => sub.remove();
}

/** Test helper: forgets which responses were handled. */
export function resetHandledResponses(): void {
  handled.clear();
}

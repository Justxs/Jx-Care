/**
 * Local notification scheduling: a pure planner and diff, plus a thin layer that talks to the OS
 * through a `NotificationOS` adapter.
 *
 * Features describe what they want with a planner (`registerPlanner`); `sync()` runs them all,
 * keeps the next 14 days (at most 60 items, iOS allows 64 pending) and changes only what differs
 * from the `scheduled_notification` table. Snoozed copies pending on the phone count towards the
 * 60, so the plan shrinks while they wait.
 *
 * Each notification's OS identifier is `<key>#<content hash>`, so a change of time or text gives
 * a new identifier: the old one is cancelled and the new one scheduled, with no extra columns.
 */
import { getDb, type Db } from '@/db';
import { getSettings, hasSettingsRow } from '@/features/settings/repo';
import { i18n } from '@/i18n';

import {
  countScheduled,
  deleteAllScheduled,
  deleteScheduled,
  insertScheduled,
  listScheduled,
  type EntityRef,
  type ScheduledRow,
} from './repo';
import type {
  NotificationData,
  NotificationEntityType,
  NotificationKind,
  NotificationOS,
  OsNotificationRequest,
  OsScheduledNotification,
  PlannedNotification,
  Planner,
  PlannerContext,
} from './types';

export const DAY_MS = 24 * 60 * 60 * 1000;
/** Only the next 14 days are kept scheduled (spec: Notifications, scheduling rule). */
export const WINDOW_MS = 14 * DAY_MS;
/**
 * iOS keeps 64 pending notifications and silently drops the rest. Planned items plus pending
 * snoozes stay at or under 60, so a snooze taken before the next re-plan still fits.
 */
export const MAX_SCHEDULED = 60;

const SNOOZE_PREFIX = 'snooze:';

// ---------------------------------------------------------------------------------------------
// Planner registry

const planners = new Map<string, Planner>();

/** Features register what they want scheduled (021 expiry and digest, 027, 033, 036, 040). */
export function registerPlanner(name: string, planner: Planner): void {
  planners.set(name, planner);
}

export function unregisterPlanner(name: string): void {
  planners.delete(name);
}

/** A stable key: 'product:12:expiry_warning:2026-11-05'. */
export function notificationKey(
  entityType: NotificationEntityType,
  entityId: number | null,
  kind: NotificationKind,
  discriminator: string,
): string {
  return `${entityType}:${entityId ?? '-'}:${kind}:${discriminator}`.replaceAll('#', '_');
}

// ---------------------------------------------------------------------------------------------
// Pure planning and diff

/** FNV-1a, 32 bit, in base 36: short and stable, enough to notice a changed time or text. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** The OS identifier: changes whenever anything the person would see changes. */
export function osIdFor(p: PlannedNotification): string {
  const content = JSON.stringify([
    p.fireAt,
    p.title,
    p.body,
    p.categoryId ?? '',
    p.channelId,
    p.data.url,
  ]);
  return `${p.key}#${hash(content)}`;
}

export function isSnoozeId(id: string): boolean {
  return id.startsWith(SNOOZE_PREFIX);
}

/** Runs every planner; one that throws is skipped so the others still get scheduled. */
export function collectPlans(ctx: PlannerContext): PlannedNotification[] {
  const all: PlannedNotification[] = [];
  for (const [name, planner] of planners) {
    try {
      all.push(...planner(ctx));
    } catch (error) {
      if (__DEV__) console.warn(`[notifications] planner ${name} failed`, error);
    }
  }
  return all;
}

/**
 * Keeps items after `now` and within the next 14 days, one per key, soonest first, at most
 * `limit` (60 less the snoozes pending on the phone).
 */
export function selectWindow(
  items: PlannedNotification[],
  now: number,
  limit: number = MAX_SCHEDULED,
): PlannedNotification[] {
  const end = now + WINDOW_MS;
  const sorted = items
    .filter((p) => p.fireAt > now && p.fireAt <= end)
    .sort((a, b) => a.fireAt - b.fireAt || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const seen = new Set<string>();
  const out: PlannedNotification[] = [];
  for (const p of sorted) {
    if (out.length >= limit) break;
    if (seen.has(p.key)) continue;
    seen.add(p.key);
    out.push(p);
  }
  return out;
}

export type SyncDiff = {
  /** Still pending on the phone but no longer wanted: cancel, then delete the row. */
  cancel: ScheduledRow[];
  /** Already fired (or duplicate rows): delete the row, nothing to cancel. */
  drop: ScheduledRow[];
  /** Wanted but not on the phone yet. */
  schedule: PlannedNotification[];
};

/** What has to change so the table (and the phone) match `planned`. */
export function diffScheduled(
  planned: PlannedNotification[],
  rows: ScheduledRow[],
  now: number,
): SyncDiff {
  const wanted = new Set(planned.map(osIdFor));
  const kept = new Set<string>();
  const diff: SyncDiff = { cancel: [], drop: [], schedule: [] };
  for (const row of rows) {
    if (wanted.has(row.notificationId) && !kept.has(row.notificationId)) {
      kept.add(row.notificationId);
    } else if (row.fireAt <= now || kept.has(row.notificationId)) {
      diff.drop.push(row);
    } else {
      diff.cancel.push(row);
    }
  }
  diff.schedule = planned.filter((p) => !kept.has(osIdFor(p)));
  return diff;
}

// ---------------------------------------------------------------------------------------------
// Side effects

let os: NotificationOS | null = null;

/** The app sets the expo-notifications adapter at start-up; tests set a fake. */
export function setNotificationOS(next: NotificationOS | null): void {
  os = next;
}

export function getNotificationOS(): NotificationOS {
  if (!os) throw new Error('Notification OS not set; call setNotificationOS() first');
  return os;
}

/** One sync at a time, so two triggers never schedule the same thing twice. */
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

/** Everything every planner wants, inside the window, at most `limit`. Nothing before onboarding. */
export function planAll(db: Db, now: number, limit: number = MAX_SCHEDULED): PlannedNotification[] {
  if (!hasSettingsRow(db)) return [];
  const settings = getSettings(db);
  const t = i18n.getFixedT(settings.language);
  return selectWindow(collectPlans({ db, now, settings, t }), now, limit);
}

/** Room left for planned items: 60 less the snoozed copies still pending on the phone. */
function roomFor(pending: OsScheduledNotification[]): number {
  return MAX_SCHEDULED - pending.filter((n) => isSnoozeId(n.id)).length;
}

function sameEntity(ref: EntityRef) {
  return (p: { entityType: string; entityId: number | null }) =>
    p.entityType === ref.entityType && p.entityId === ref.entityId;
}

function toRequest(p: PlannedNotification): OsNotificationRequest {
  return {
    id: osIdFor(p),
    fireAt: p.fireAt,
    title: p.title,
    body: p.body,
    categoryId: p.categoryId,
    channelId: p.channelId,
    data: {
      url: p.data.url,
      key: p.key,
      entityType: p.entityType,
      entityId: p.entityId,
      kind: p.kind,
      channelId: p.channelId,
    },
  };
}

export type SyncResult = { scheduled: number; cancelled: number };

async function apply(db: Db, adapter: NotificationOS, diff: SyncDiff): Promise<SyncResult> {
  let cancelled = 0;
  for (const row of diff.cancel) {
    try {
      await adapter.cancel(row.notificationId);
      cancelled++;
    } catch {
      // Already gone from the phone; the row goes either way.
    }
  }
  deleteScheduled(
    db,
    [...diff.cancel, ...diff.drop].map((r) => r.id),
  );
  let scheduled = 0;
  for (const p of diff.schedule) {
    try {
      const notificationId = await adapter.schedule(toRequest(p));
      insertScheduled(db, {
        entityType: p.entityType,
        entityId: p.entityId,
        kind: p.kind,
        notificationId,
        fireAt: p.fireAt,
      });
      scheduled++;
    } catch (error) {
      // Not recorded, so the next sync tries again.
      if (__DEV__) console.warn(`[notifications] could not schedule ${p.key}`, error);
    }
  }
  return { scheduled, cancelled };
}

async function cancelRows(db: Db, adapter: NotificationOS, rows: ScheduledRow[]) {
  return apply(db, adapter, { cancel: rows, drop: [], schedule: [] });
}

/**
 * Compares the table with what the phone really has pending: cancels our notifications the table
 * doesn't know (for example after a restore), and forgets rows the phone lost so they are
 * scheduled again. Snoozed copies are left alone.
 */
async function reconcile(
  db: Db,
  adapter: NotificationOS,
  pending: OsScheduledNotification[],
  now: number,
): Promise<void> {
  const pendingIds = new Set(pending.map((n) => n.id));
  const rows = listScheduled(db);
  const known = new Set(rows.map((r) => r.notificationId));
  for (const n of pending) {
    if (!known.has(n.id) && !isSnoozeId(n.id)) {
      await adapter.cancel(n.id).catch(() => {});
    }
  }
  deleteScheduled(
    db,
    rows.filter((r) => r.fireAt > now && !pendingIds.has(r.notificationId)).map((r) => r.id),
  );
}

async function syncNow(db: Db, adapter: NotificationOS, now: number, reconcileFirst: boolean) {
  if ((await adapter.getPermission()) !== 'granted') {
    return cancelRows(db, adapter, listScheduled(db));
  }
  // One read of the phone's pending list: reconcile uses it, and pending snoozes take room.
  const pending = await adapter.getAllScheduled();
  if (reconcileFirst) await reconcile(db, adapter, pending, now);
  const diff = diffScheduled(planAll(db, now, roomFor(pending)), listScheduled(db), now);
  return apply(db, adapter, diff);
}

export type SyncOptions = {
  /**
   * Also compare with the phone's pending list first (app open, background refresh, after a
   * restore).
   */
  reconcile?: boolean;
};

/**
 * Tops up the next 14 days: runs every planner and schedules, cancels or reschedules only what
 * changed. Without permission it cancels everything and schedules nothing.
 */
export function sync(now: number = Date.now(), opts: SyncOptions = {}): Promise<SyncResult> {
  return serial(() => syncNow(getDb(), getNotificationOS(), now, opts.reconcile ?? false));
}

/**
 * The same diff limited to one entity, after a product, routine or hair task changes. Falls back
 * to a full `sync` if the entity's new items would push the phone over 60 pending (snoozes count).
 */
export function syncEntity(
  entityType: NotificationEntityType,
  entityId: number | null,
  now: number = Date.now(),
): Promise<SyncResult> {
  return serial(async () => {
    const db = getDb();
    const adapter = getNotificationOS();
    const ref: EntityRef = { entityType, entityId };
    if ((await adapter.getPermission()) !== 'granted') {
      return cancelRows(db, adapter, listScheduled(db, ref));
    }
    const room = roomFor(await adapter.getAllScheduled());
    const planned = planAll(db, now, room).filter(sameEntity(ref));
    const result = await apply(db, adapter, diffScheduled(planned, listScheduled(db, ref), now));
    if (countScheduled(db) > room) {
      const full = await syncNow(db, adapter, now, false);
      return {
        scheduled: result.scheduled + full.scheduled,
        cancelled: result.cancelled + full.cancelled,
      };
    }
    return result;
  });
}

/** Cancels every notification (reset app, task 018) and empties the table. */
export function cancelAllNotifications(): Promise<void> {
  return serial(async () => {
    const adapter = getNotificationOS();
    for (const n of await adapter.getAllScheduled()) {
      await adapter.cancel(n.id).catch(() => {});
    }
    deleteAllScheduled(getDb());
  });
}

// ---------------------------------------------------------------------------------------------
// Snooze: one-off copies outside the plan, so sync never cancels them. They are not in the table;
// the phone's pending list is where sync finds and counts them.

export type SnoozeSource = {
  data: NotificationData;
  title: string;
  body: string;
  categoryId?: OsNotificationRequest['categoryId'];
  channelId: OsNotificationRequest['channelId'];
};

export function snoozeIdFor(key: string): string {
  return `${SNOOZE_PREFIX}${key}`;
}

/**
 * Schedules a copy of a notification `minutes` from now; snoozing again replaces it. Then
 * re-plans, so the latest planned item makes room and the phone stays at or under 60 pending.
 */
export function scheduleSnooze(
  source: SnoozeSource,
  minutes: number,
  now: number = Date.now(),
): Promise<string> {
  return serial(async () => {
    const adapter = getNotificationOS();
    const id = await adapter.schedule({
      id: snoozeIdFor(source.data.key),
      fireAt: now + minutes * 60 * 1000,
      title: source.title,
      body: source.body,
      categoryId: source.categoryId,
      channelId: source.channelId,
      data: source.data,
    });
    try {
      await syncNow(getDb(), adapter, now, false);
    } catch (error) {
      // The snooze is scheduled; the next app open or refresh re-plans.
      if (__DEV__) console.warn('[notifications] re-plan after snooze failed', error);
    }
    return id;
  });
}

/** Cancels pending snoozed copies for one entity (a routine completed before the snooze fired). */
export function cancelSnoozes(
  entityType: NotificationEntityType,
  entityId: number | null,
): Promise<number> {
  return serial(async () => {
    const adapter = getNotificationOS();
    let cancelled = 0;
    for (const n of await adapter.getAllScheduled()) {
      if (isSnoozeId(n.id) && n.data.entityType === entityType && n.data.entityId === entityId) {
        await adapter.cancel(n.id).catch(() => {});
        cancelled++;
      }
    }
    return cancelled;
  });
}

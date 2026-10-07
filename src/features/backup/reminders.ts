/**
 * The backup reminder (spec: Notifications, Backup reminder; task 040). Imported by
 * `src/notifications/tasks.ts`, so the planner exists in a headless start too.
 */
import { min } from 'drizzle-orm';

import type { Db } from '@/db';
import { product } from '@/db/schema';
import { addDays, appDay, diffDays, momentOf } from '@/lib/appDay';
import { notificationKey, registerPlanner, type Planner } from '@/notifications';

/** A backup older than this is due again (S8 callout, reminder). */
export const BACKUP_DUE_DAYS = 30;
/** The reminder's time of day. */
export const BACKUP_REMINDER_TIME = '10:00';
/** Where the reminder opens. */
export const BACKUP_URL = '/settings/backup';

/** When the person first added a product (ms), or null with no products. */
function firstProductAt(db: Db): number | null {
  return (
    db
      .select({ at: min(product.createdAt) })
      .from(product)
      .get()?.at ?? null
  );
}

/**
 * The app day the reminders count from: the last backup, or, with none yet, the first product
 * (no product means nothing worth backing up, so no reminder).
 */
export function backupAnchorDay(db: Db, lastBackupAt: number | null): string | null {
  const at = lastBackupAt ?? firstProductAt(db);
  return at === null ? null : appDay(at);
}

/**
 * Whether S8 shows its amber callout on app day `today`: no backup yet, or the last one more than
 * 30 days ago.
 */
export function isBackupDue(lastBackupAt: number | null, today: string): boolean {
  if (lastBackupAt === null) return true;
  return diffDays(today, appDay(lastBackupAt)) > BACKUP_DUE_DAYS;
}

/**
 * One "Back up your Jx Care data" at 10:00, 30 days after the anchor, then every 30 days while no
 * new backup is made (at most once a month). The days are fixed from the anchor, so planning
 * again (every app open, the daily background sync) never adds an extra one. Only the next one
 * after `now` is planned; a backup moves the anchor and the scheduler drops the old one.
 */
export const planBackupReminder: Planner = ({ db, now, settings, t }) => {
  const anchor = backupAnchorDay(db, settings.lastBackupAt);
  if (anchor === null) return [];
  const sinceAnchor = diffDays(appDay(now), anchor);
  let k = Math.max(1, Math.floor(sinceAnchor / BACKUP_DUE_DAYS));
  let day = addDays(anchor, k * BACKUP_DUE_DAYS);
  while (momentOf(day, BACKUP_REMINDER_TIME) <= now) {
    k++;
    day = addDays(anchor, k * BACKUP_DUE_DAYS);
  }
  return [
    {
      key: notificationKey('backup', null, 'backup', day),
      entityType: 'backup',
      entityId: null,
      kind: 'backup',
      fireAt: momentOf(day, BACKUP_REMINDER_TIME),
      title: t('backup.reminder.title'),
      body: '',
      channelId: 'digest',
      data: { url: BACKUP_URL },
    },
  ];
};

registerPlanner('backup', planBackupReminder);

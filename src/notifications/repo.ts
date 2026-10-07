import { and, eq, inArray, isNull } from 'drizzle-orm';

import type { Db } from '@/db';
import { scheduledNotification } from '@/db/schema';

import type { NotificationEntityType, NotificationKind } from './types';

export type ScheduledRow = typeof scheduledNotification.$inferSelect;

export type EntityRef = { entityType: NotificationEntityType; entityId: number | null };

function entityWhere(ref: EntityRef) {
  return and(
    eq(scheduledNotification.entityType, ref.entityType),
    ref.entityId === null
      ? isNull(scheduledNotification.entityId)
      : eq(scheduledNotification.entityId, ref.entityId),
  );
}

/** Every row, or only one entity's rows. */
export function listScheduled(db: Db, ref?: EntityRef): ScheduledRow[] {
  const q = db.select().from(scheduledNotification);
  return (ref ? q.where(entityWhere(ref)) : q).orderBy(scheduledNotification.fireAt).all();
}

export function countScheduled(db: Db): number {
  return db.select({ id: scheduledNotification.id }).from(scheduledNotification).all().length;
}

export function insertScheduled(
  db: Db,
  row: {
    entityType: NotificationEntityType;
    entityId: number | null;
    kind: NotificationKind;
    notificationId: string;
    fireAt: number;
  },
): void {
  db.insert(scheduledNotification).values(row).run();
}

export function deleteScheduled(db: Db, ids: number[]): void {
  if (ids.length === 0) return;
  db.delete(scheduledNotification).where(inArray(scheduledNotification.id, ids)).run();
}

export function deleteAllScheduled(db: Db): void {
  db.delete(scheduledNotification).run();
}

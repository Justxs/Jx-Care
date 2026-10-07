import { and, asc, desc, eq, gt, gte, inArray, isNotNull, lte } from 'drizzle-orm';

import type { Db, DbOrTx } from '@/db';
import type { Area, HairOtherKind } from '@/db/enums';
import { hairLog, hairTask, product } from '@/db/schema';
import type { HairLog, HairTask } from '@/db/schema';
import { addUsedInSource } from '@/features/products/repo';
import type { UsedIn } from '@/features/products/types';
import { appDay } from '@/lib/appDay';
import {
  dueDayAsOf,
  hairMonthMarks,
  hairTaskState,
  logTiming,
  nextDue,
  previousScheduledBefore,
  quickSetupToTask,
  type HairDayMark,
  type HairLogLite,
  type HairState,
  type HairTaskLite,
  type QuickWashFrequency,
} from '@/lib/hair';

import type { HairTaskInput } from './schema';

// ─── Types ──────────────────────────────────────────────────────────────────

export type HairProductRef = {
  id: number;
  name: string;
  brand: string | null;
  area: Area;
  archived: boolean;
};

export type HairTaskRow = HairTask & {
  nextDue: string;
  state: HairState;
  overdueDays: number;
  /** The task's products that still exist, in the task's order. */
  products: HairProductRef[];
  productNames: string[];
};

export type HairTaskGroups = { washes: HairTaskRow[]; other: HairTaskRow[] };

export type HairLogRow = HairLog & {
  timing: 'on_time' | 'late';
  products: HairProductRef[];
};

export type HairTaskDetail = HairTaskRow & { logs: HairLogRow[] };

export type HairDayLog = HairLogRow & {
  taskName: string;
  kind: HairTask['kind'];
  otherKind: HairOtherKind | null;
};

export type HairStreakInput = { tasks: HairTaskLite[]; logs: HairLogLite[]; today: string };

// ─── Helpers ────────────────────────────────────────────────────────────────

export function toHairLite(t: HairTask): HairTaskLite {
  return {
    id: t.id,
    kind: t.kind,
    otherKind: t.otherKind,
    scheduleKind: t.scheduleKind,
    everyNDays: t.everyNDays,
    daysOfWeek: t.daysOfWeek,
    lastDoneAt: t.lastDoneAt,
    active: t.active,
    createdDay: appDay(t.createdAt),
  };
}

/** Product id → reference, for every id given (missing products are left out). */
function productRefs(db: DbOrTx, ids: Iterable<number>): Map<number, HairProductRef> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = db
    .select({
      id: product.id,
      name: product.name,
      brand: product.brand,
      area: product.area,
      archivedAt: product.archivedAt,
    })
    .from(product)
    .where(inArray(product.id, unique))
    .all();
  return new Map(
    rows.map((p) => [
      p.id,
      { id: p.id, name: p.name, brand: p.brand, area: p.area, archived: p.archivedAt !== null },
    ]),
  );
}

function pickRefs(refs: Map<number, HairProductRef>, ids: readonly number[]): HairProductRef[] {
  return ids.flatMap((id) => {
    const ref = refs.get(id);
    return ref ? [ref] : [];
  });
}

function toRow(t: HairTask, today: string, refs: Map<number, HairProductRef>): HairTaskRow {
  const { dueDay, state, overdueDays } = hairTaskState(toHairLite(t), today);
  const products = pickRefs(refs, t.productIds);
  return {
    ...t,
    nextDue: dueDay,
    state,
    overdueDays,
    products,
    productNames: products.map((p) => p.name),
  };
}

function toLogRow(l: HairLog, refs: Map<number, HairProductRef>): HairLogRow {
  return { ...l, timing: logTiming(l.day, l.dueDay), products: pickRefs(refs, l.productIds) };
}

const byDue = (a: HairTaskRow, b: HairTaskRow) =>
  a.nextDue < b.nextDue ? -1 : a.nextDue > b.nextDue ? 1 : a.name.localeCompare(b.name);

function activeRows(db: Db, today: string): HairTaskRow[] {
  const tasks = db.select().from(hairTask).where(eq(hairTask.active, true)).all();
  const refs = productRefs(
    db,
    tasks.flatMap((t) => t.productIds),
  );
  return tasks.map((t) => toRow(t, today, refs)).toSorted(byDue);
}

// ─── Reads ──────────────────────────────────────────────────────────────────

/** Active tasks with their next due day and state, in two groups (R1 Hair), soonest first. */
export function listHairTasks(db: Db, today: string): HairTaskGroups {
  const rows = activeRows(db, today);
  return {
    washes: rows.filter((r) => r.kind === 'wash'),
    other: rows.filter((r) => r.kind === 'other'),
  };
}

export function hasAnyHairTask(db: Db): boolean {
  return db.select({ id: hairTask.id }).from(hairTask).limit(1).all().length > 0;
}

/** One task (active or not) with its products and its last 10 logs, newest first. */
export function getHairTask(db: Db, id: number, today: string): HairTaskDetail | null {
  const t = db.select().from(hairTask).where(eq(hairTask.id, id)).get();
  if (!t) return null;
  const logs = db
    .select()
    .from(hairLog)
    .where(eq(hairLog.hairTaskId, id))
    .orderBy(desc(hairLog.day), desc(hairLog.id))
    .limit(10)
    .all();
  const refs = productRefs(db, [...t.productIds, ...logs.flatMap((l) => l.productIds)]);
  return { ...toRow(t, today, refs), logs: logs.map((l) => toLogRow(l, refs)) };
}

/** Today's "Hair due" rows (T1): active tasks due today or overdue, most overdue first. */
export function hairDueToday(db: Db, today: string): HairTaskRow[] {
  return activeRows(db, today).filter((r) => r.state !== 'upcoming');
}

/** Marks for the C1 Hair view, by day, for the days shown (usually the 42-day grid). */
export function hairMonth(
  db: Db,
  monthDays: readonly string[],
  today: string,
): Record<string, HairDayMark> {
  if (monthDays.length === 0) return {};
  const first = monthDays.reduce((a, b) => (a < b ? a : b));
  const last = monthDays.reduce((a, b) => (a > b ? a : b));
  const tasks = db.select().from(hairTask).all().map(toHairLite);
  const logs: HairLogLite[] = db
    .select({ hairTaskId: hairLog.hairTaskId, day: hairLog.day, dueDay: hairLog.dueDay })
    .from(hairLog)
    .where(and(gte(hairLog.day, first), lte(hairLog.day, last)))
    .all();
  return Object.fromEntries(hairMonthMarks(tasks, logs, monthDays, today));
}

/** Hair tasks done on a day (C2), washes first, in the order they were logged. */
export function hairLogsOnDay(db: Db, day: string): HairDayLog[] {
  const rows = db
    .select({ log: hairLog, task: hairTask })
    .from(hairLog)
    .innerJoin(hairTask, eq(hairTask.id, hairLog.hairTaskId))
    .where(eq(hairLog.day, day))
    .orderBy(asc(hairLog.id))
    .all();
  const refs = productRefs(
    db,
    rows.flatMap((r) => r.log.productIds),
  );
  return rows
    .map(({ log, task }) => ({
      ...toLogRow(log, refs),
      taskName: task.name,
      kind: task.kind,
      otherKind: task.otherKind,
    }))
    .toSorted((a, b) => (a.kind === b.kind ? 0 : a.kind === 'wash' ? -1 : 1));
}

/**
 * C2 "Next wash was due 6 Oct": for a day with no hair logs, the earliest due day of an active
 * wash task that had come by that day (as things stood then), or null when no wash was due.
 */
export function washDueOn(db: Db, day: string): string | null {
  const tasks = db
    .select()
    .from(hairTask)
    .where(and(eq(hairTask.kind, 'wash'), eq(hairTask.active, true)))
    .all()
    .map(toHairLite)
    .filter((t) => t.createdDay <= day);
  if (tasks.length === 0) return null;
  const logs: HairLogLite[] = db
    .select({ hairTaskId: hairLog.hairTaskId, day: hairLog.day, dueDay: hairLog.dueDay })
    .from(hairLog)
    .where(
      and(
        inArray(
          hairLog.hairTaskId,
          tasks.map((t) => t.id),
        ),
        gt(hairLog.day, day),
      ),
    )
    .all();
  let earliest: string | null = null;
  for (const t of tasks) {
    const due = dueDayAsOf(t, logs, day);
    if (due && due <= day && (earliest === null || due < earliest)) earliest = due;
  }
  return earliest;
}

/** True when an active wash task exists (the hair streak chip and card show only then). */
export function hasWashTask(db: Db): boolean {
  return (
    db
      .select({ id: hairTask.id })
      .from(hairTask)
      .where(and(eq(hairTask.kind, 'wash'), eq(hairTask.active, true)))
      .limit(1)
      .all().length > 0
  );
}

/** Active tasks with a reminder time, with their next due day (hair reminders planner). */
export function listReminderTasks(db: Db, today: string): HairTaskRow[] {
  const tasks = db
    .select()
    .from(hairTask)
    .where(and(eq(hairTask.active, true), isNotNull(hairTask.reminderTime)))
    .all();
  const refs = productRefs(
    db,
    tasks.flatMap((t) => t.productIds),
  );
  return tasks.map((t) => toRow(t, today, refs)).toSorted(byDue);
}

/** True when the task already has a log on `day`. */
export function hasHairLogOn(db: Db, taskId: number, day: string): boolean {
  return (
    db
      .select({ id: hairLog.id })
      .from(hairLog)
      .where(and(eq(hairLog.hairTaskId, taskId), eq(hairLog.day, day)))
      .limit(1)
      .all().length > 0
  );
}

/**
 * Input for `hairStreak()`: wash tasks (active or not, so their history still counts) and their
 * logs only. Other care never counts toward the hair streak.
 */
export function hairStreakInput(db: Db, today: string): HairStreakInput {
  const tasks = db.select().from(hairTask).where(eq(hairTask.kind, 'wash')).all().map(toHairLite);
  const ids = tasks.map((t) => t.id);
  const logs: HairLogLite[] =
    ids.length === 0
      ? []
      : db
          .select({ hairTaskId: hairLog.hairTaskId, day: hairLog.day, dueDay: hairLog.dueDay })
          .from(hairLog)
          .where(inArray(hairLog.hairTaskId, ids))
          .all();
  return { tasks, logs, today };
}

/** Hair tasks (active or not) that list the product, by name (P2 "Used in"). */
export function hairUsedIn(db: Db, productId: number): UsedIn[] {
  return db
    .select({ id: hairTask.id, name: hairTask.name, productIds: hairTask.productIds })
    .from(hairTask)
    .orderBy(asc(hairTask.name))
    .all()
    .filter((t) => t.productIds.includes(productId))
    .map((t) => ({ kind: 'hair' as const, id: t.id, name: t.name }));
}

export function hairTaskCountByProduct(db: Db, productId: number): number {
  return hairUsedIn(db, productId).length;
}

addUsedInSource(hairUsedIn);

// ─── Writes ─────────────────────────────────────────────────────────────────

/** Keeps only products that exist and are for hair (Hair or Both), in order. */
function hairProductIds(db: DbOrTx, ids: readonly number[]): number[] {
  const refs = productRefs(db, ids);
  return [...new Set(ids)].filter((id) => {
    const area = refs.get(id)?.area;
    return area === 'hair' || area === 'both';
  });
}

function taskValues(db: DbOrTx, input: HairTaskInput) {
  return {
    name: input.name,
    kind: input.kind,
    otherKind: input.kind === 'wash' ? null : (input.otherKind ?? 'other'),
    productIds: input.kind === 'wash' ? hairProductIds(db, input.productIds) : [],
    scheduleKind: input.scheduleKind,
    everyNDays: input.scheduleKind === 'interval' ? input.everyNDays : null,
    intervalUnit: input.intervalUnit,
    daysOfWeek: input.scheduleKind === 'days' ? input.daysOfWeek : null,
    lastDoneAt: input.lastDoneAt,
    reminderTime: input.reminderTime,
  };
}

/**
 * Inserts a task, or updates it when `id` is given. "Last done" is stored as `lastDoneAt`, so
 * for a new task it sets the first due date (R5). Returns the id.
 */
export function saveHairTask(db: DbOrTx, input: HairTaskInput, id?: number): number {
  const values = taskValues(db, input);
  if (id == null) {
    return db.insert(hairTask).values(values).returning({ id: hairTask.id }).get().id;
  }
  db.update(hairTask).set(values).where(eq(hairTask.id, id)).run();
  return id;
}

export type QuickHairSetup = { frequency: QuickWashFrequency; lastWash: string; trim: boolean };

/** Quick hair setup (R5): the wash task and, when asked, a trim every 8 weeks from today. */
export function quickSetup(
  db: Db,
  input: QuickHairSetup,
  today: string,
  names: { wash: string; trim: string } = { wash: 'Wash', trim: 'Trim' },
): { washId: number; trimId: number | null } {
  return db.transaction((tx) => {
    const schedule = quickSetupToTask(input.frequency);
    const washId = saveHairTask(tx, {
      name: names.wash,
      kind: 'wash',
      otherKind: null,
      productIds: [],
      ...schedule,
      lastDoneAt: input.lastWash,
      reminderTime: null,
    });
    const trimId = input.trim
      ? saveHairTask(tx, {
          name: names.trim,
          kind: 'other',
          otherKind: 'trim',
          productIds: [],
          scheduleKind: 'interval',
          everyNDays: 56,
          intervalUnit: 'weeks',
          daysOfWeek: null,
          lastDoneAt: today,
          reminderTime: null,
        })
      : null;
    return { washId, trimId };
  });
}

export type MarkHairDone = { day: string; productIds: number[]; note: string | null };

/**
 * Logs a task as done on `day` (T3). The log keeps the due day it answered, so the calendar and
 * streak can tell on time from late. `lastDoneAt` only moves forward, so logging an older wash
 * doesn't move the schedule back. A second log for the same task and day replaces the first's
 * products and note. Returns the log id and the new next due day.
 */
export function markHairDone(
  db: Db,
  taskId: number,
  done: MarkHairDone,
): { logId: number; nextDue: string } {
  return db.transaction((tx) => {
    const t = tx.select().from(hairTask).where(eq(hairTask.id, taskId)).get();
    if (!t) throw new Error(`Hair task ${taskId} not found`);
    const existing = tx
      .select({ id: hairLog.id })
      .from(hairLog)
      .where(and(eq(hairLog.hairTaskId, taskId), eq(hairLog.day, done.day)))
      .get();
    let logId: number;
    if (existing) {
      tx.update(hairLog)
        .set({ productIds: done.productIds, note: done.note })
        .where(eq(hairLog.id, existing.id))
        .run();
      logId = existing.id;
    } else {
      logId = tx
        .insert(hairLog)
        .values({
          hairTaskId: taskId,
          day: done.day,
          dueDay: nextDue(toHairLite(t)),
          productIds: done.productIds,
          note: done.note,
        })
        .returning({ id: hairLog.id })
        .get().id;
    }
    let lastDoneAt = t.lastDoneAt;
    if (!lastDoneAt || done.day > lastDoneAt) {
      lastDoneAt = done.day;
      tx.update(hairTask).set({ lastDoneAt }).where(eq(hairTask.id, taskId)).run();
    }
    return { logId, nextDue: nextDue({ ...toHairLite(t), lastDoneAt }) };
  });
}

/**
 * Deletes a log (C2 edits). When it was the log that set `lastDoneAt`, the schedule goes back:
 * the latest remaining log, or the last done day that gave the deleted log its due day (the
 * "Last done" from setup, when no other log is left). Returns the task id, or null.
 */
export function deleteHairLog(db: Db, logId: number): number | null {
  return db.transaction((tx) => {
    const log = tx.select().from(hairLog).where(eq(hairLog.id, logId)).get();
    if (!log) return null;
    tx.delete(hairLog).where(eq(hairLog.id, logId)).run();
    const t = tx.select().from(hairTask).where(eq(hairTask.id, log.hairTaskId)).get();
    if (!t || t.lastDoneAt !== log.day) return log.hairTaskId;

    const remaining = tx
      .select({ day: hairLog.day })
      .from(hairLog)
      .where(eq(hairLog.hairTaskId, t.id))
      .all()
      .map((l) => l.day);
    if (remaining.includes(log.day)) return t.id;
    const candidates = remaining.filter((d) => d < log.day);
    if (log.dueDay) candidates.push(previousScheduledBefore(toHairLite(t), log.dueDay));
    const lastDoneAt = candidates.length > 0 ? candidates.reduce((a, b) => (a > b ? a : b)) : null;
    tx.update(hairTask).set({ lastDoneAt }).where(eq(hairTask.id, t.id)).run();
    return t.id;
  });
}

/** Deletes a task and (by cascade) its logs. */
export function deleteHairTask(db: Db, id: number): void {
  db.delete(hairTask).where(eq(hairTask.id, id)).run();
}

export function setHairTaskActive(db: Db, id: number, active: boolean): void {
  db.update(hairTask).set({ active }).where(eq(hairTask.id, id)).run();
}

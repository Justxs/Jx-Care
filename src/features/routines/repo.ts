import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, sql } from 'drizzle-orm';

import type { Db, DbOrTx } from '@/db';
import {
  hairTask,
  product,
  routine,
  routineChoice,
  routineLog,
  routineStep,
  type Routine,
  type RoutineLog,
  type RoutineStep,
} from '@/db/schema';
import { addUsedInSource } from '@/features/products/repo';
import type { PickerProduct, UsedIn } from '@/features/products/types';
import { addDays, appDay, daysBetween } from '@/lib/appDay';
import { daysLeft, effectiveExpiry, expiryStatus, type ExpiryStatus } from '@/lib/expiry';
import {
  dueSteps,
  groupBy,
  routineProgress,
  todayGroups,
  type RoutineLite,
  type RoutineLogLite,
  type RoutineProgress,
  type StepLite,
} from '@/lib/schedule';
import { groupComplete, type SkinStreakInput } from '@/lib/streak';

import type { RoutineInput, StepInput } from './schema';

// ─── Types ──────────────────────────────────────────────────────────────────

/** The product a step uses, with what Today and the player need to flag it (refinement 11). */
export type StepProduct = {
  id: number;
  name: string;
  brand: string | null;
  photoUri: string | null;
  area: PickerProduct['area'];
  category: PickerProduct['category'];
  archivedAt: string | null;
  status: ExpiryStatus;
  effectiveExpiry: string | null;
  daysLeft: number | null;
  /** Finished (archived) wins over expired; null when the product is fine to use. */
  problem: 'finished' | 'expired' | null;
};

export type RoutineStepItem = Omit<RoutineStep, 'createdAt' | 'updatedAt'> & {
  product: StepProduct | null;
};

export type RoutineItem = Omit<Routine, 'updatedAt'> & {
  /**
   * App day the routine was created or its schedule last changed; earlier days count only
   * through their logs' snapshots.
   */
  createdDay: string;
  /**
   * Every step in order, whatever its schedule. Deleted steps only in `listRoutinesWithHistory`,
   * where `dayRoutine` keeps those that still counted on the day.
   */
  steps: RoutineStepItem[];
  stepCount: number;
};

/** A deleted routine in the R1 "Deleted routines" sheet. */
export type DeletedRoutine = Pick<Routine, 'id' | 'name' | 'timeOfDay' | 'customName'> & {
  deletedAt: number;
};

/** A routine on one day: what Today's card and the player show. */
export type DayRoutine = RoutineItem & {
  /** Steps due that day, in order (the log's snapshot once the day has a tick). */
  dueSteps: RoutineStepItem[];
  progress: RoutineProgress;
  log: RoutineLog | null;
};

/** One Today card: a time of day with its A/B options (spec T1, refinement 3). */
export type TodayRoutineGroup = {
  key: string;
  timeOfDay: Routine['timeOfDay'];
  customName: string | null;
  routines: DayRoutine[];
  /**
   * The routine the card shows: the finished one, else the one already ticked, else the
   * remembered pick, else the first.
   */
  chosenId: number;
  /** Something is ticked, so the A/B choice is fixed for the day. */
  started: boolean;
  /** Finishing either option completes the time of day. */
  complete: boolean;
};

export type SaveRoutineInput = RoutineInput & { id?: number | null; active?: boolean };

// ─── Reads ──────────────────────────────────────────────────────────────────

/**
 * Whether a routine or step deleted at `deletedAt` (null: not deleted) still counts on `day`.
 * Deleting is soft: the days before the deletion keep it, from that day on it is gone.
 */
export function countsOn(deletedAt: number | null, day: string): boolean {
  return deletedAt === null || appDay(deletedAt) > day;
}

/** Whether a step id counts on a day, from the steps' rows (an id with no row never does). */
function stepCounter(rows: readonly { id: number; deletedAt: number | null }[]) {
  const deletedAt = new Map(rows.map((s) => [s.id, s.deletedAt]));
  return (id: number, day: string) => deletedAt.has(id) && countsOn(deletedAt.get(id)!, day);
}

/** A product with its expiry status on `today`; also the R4 picker's Recent rows. */
function stepProduct(p: typeof product.$inferSelect, today: string, warnDays: number): StepProduct {
  const status = expiryStatus(p, today, warnDays);
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    photoUri: p.photoUri,
    area: p.area,
    category: p.category,
    archivedAt: p.archivedAt,
    status,
    effectiveExpiry: effectiveExpiry(p),
    daysLeft: daysLeft(p, today),
    problem: p.archivedAt ? 'finished' : status === 'expired' ? 'expired' : null,
  };
}

/** Steps with their products; deleted steps only with `deleted` 'with' or 'only'. */
function loadSteps(
  db: DbOrTx,
  routineIds: readonly number[] | null,
  today: string,
  warnDays: number,
  deleted: 'without' | 'with' | 'only' = 'without',
): RoutineStepItem[] {
  return db
    .select({ step: routineStep, product })
    .from(routineStep)
    .leftJoin(product, eq(product.id, routineStep.productId))
    .where(
      and(
        routineIds ? inArray(routineStep.routineId, [...routineIds]) : undefined,
        deleted === 'without'
          ? isNull(routineStep.deletedAt)
          : deleted === 'only'
            ? isNotNull(routineStep.deletedAt)
            : undefined,
      ),
    )
    .orderBy(asc(routineStep.routineId), asc(routineStep.position), asc(routineStep.id))
    .all()
    .map(({ step, product: p }) => {
      const { createdAt: _c, updatedAt: _u, ...rest } = step;
      return { ...rest, product: p ? stepProduct(p, today, warnDays) : null };
    });
}

function routineLite(r: Routine): RoutineLite {
  return {
    id: r.id,
    name: r.name,
    timeOfDay: r.timeOfDay,
    customName: r.customName,
    sortTime: r.sortTime,
    daysOfWeek: r.daysOfWeek,
    // A deleted routine is due on no day; its past counts through its logs.
    active: r.active && r.deletedAt === null,
    createdDay: appDay(r.createdAt),
  };
}

function toItem(r: Routine, steps: RoutineStepItem[]): RoutineItem {
  const { updatedAt: _u, ...rest } = r;
  return { ...rest, createdDay: appDay(r.createdAt), steps, stepCount: steps.length };
}

/**
 * Every routine that isn't deleted, with its steps and their products, by `sortTime` then id (R1
 * groups them). `today` and `warnDays` give each step product its expiry status.
 */
export function listRoutines(db: DbOrTx, today: string, warnDays: number): RoutineItem[] {
  const rows = db
    .select()
    .from(routine)
    .where(isNull(routine.deletedAt))
    .orderBy(asc(routine.sortTime), asc(routine.id))
    .all();
  const steps = groupBy(loadSteps(db, null, today, warnDays), (s) => s.routineId);
  return rows.map((r) => toItem(r, steps.get(r.id) ?? []));
}

/** Like `listRoutines`, with deleted routines and steps too: what a past day (C2) may show. */
export function listRoutinesWithHistory(
  db: DbOrTx,
  today: string,
  warnDays: number,
): RoutineItem[] {
  const rows = db.select().from(routine).orderBy(asc(routine.sortTime), asc(routine.id)).all();
  const steps = groupBy(loadSteps(db, null, today, warnDays, 'with'), (s) => s.routineId);
  return rows.map((r) => toItem(r, steps.get(r.id) ?? []));
}

/** Deleted routines, most recently deleted first (R1 "Deleted routines"). */
export function listDeletedRoutines(db: DbOrTx): DeletedRoutine[] {
  return db
    .select({
      id: routine.id,
      name: routine.name,
      timeOfDay: routine.timeOfDay,
      customName: routine.customName,
      deletedAt: routine.deletedAt,
    })
    .from(routine)
    .where(isNotNull(routine.deletedAt))
    .orderBy(desc(routine.deletedAt), desc(routine.id))
    .all()
    .map((r) => ({ ...r, deletedAt: r.deletedAt! }));
}

/** A routine (deleted or not) with the steps it has now. */
export function getRoutine(
  db: DbOrTx,
  id: number,
  today: string,
  warnDays: number,
): RoutineItem | null {
  const r = db.select().from(routine).where(eq(routine.id, id)).get();
  return r ? toItem(r, loadSteps(db, [id], today, warnDays)) : null;
}

/** A routine's deleted steps, most recently deleted first (R2 "Deleted steps"). */
export function deletedSteps(
  db: DbOrTx,
  routineId: number,
  today: string,
  warnDays: number,
): RoutineStepItem[] {
  return loadSteps(db, [routineId], today, warnDays, 'only').sort(
    (a, b) => b.deletedAt! - a.deletedAt! || b.id - a.id,
  );
}

export function getDayLog(db: DbOrTx, routineId: number, day: string): RoutineLog | null {
  return (
    db
      .select()
      .from(routineLog)
      .where(and(eq(routineLog.routineId, routineId), eq(routineLog.day, day)))
      .get() ?? null
  );
}

/**
 * The log as progress should read it: the snapshot of due steps, minus steps that no longer
 * count that day (deleted on it or before, or gone for good), so a removed step can never block
 * a day (an empty result falls back to the schedule).
 */
function liveLog(log: RoutineLog | null, stepIds: ReadonlySet<number>) {
  if (!log) return null;
  return { ...log, dueStepIds: log.dueStepIds.filter((id) => stepIds.has(id)) };
}

/**
 * A routine on `day` with the steps it had then, its due steps and progress. Pure; the optimistic
 * tick reuses it.
 */
export function dayRoutine(r: RoutineItem, log: RoutineLog | null, day: string): DayRoutine {
  const steps = r.steps.filter((s) => countsOn(s.deletedAt, day));
  const progress = routineProgress(r, steps, liveLog(log, new Set(steps.map((s) => s.id))), day);
  const due = new Set(progress.dueStepIds);
  return {
    ...r,
    steps,
    stepCount: steps.length,
    dueSteps: steps.filter((s) => due.has(s.id)),
    progress,
    log,
  };
}

function logsOn(db: DbOrTx, day: string): Map<number, RoutineLog> {
  const rows = db.select().from(routineLog).where(eq(routineLog.day, day)).all();
  return new Map(rows.map((l) => [l.routineId, l]));
}

/** The option a time of day shows and opens: `chosenId`, else the first. */
export function chosenRoutine<R extends { id: number }>(group: {
  routines: readonly R[];
  chosenId: number;
}): R {
  return group.routines.find((r) => r.id === group.chosenId) ?? group.routines[0]!;
}

/** Builds the Today groups from routines already loaded for `day`. Exported for the optimistic tick. */
export function groupDayRoutines(
  groups: readonly { key: string; routines: readonly DayRoutine[]; chosenId: number }[],
): TodayRoutineGroup[] {
  return groups.map((g) => {
    const first = g.routines[0]!;
    const started = g.routines.find((r) => r.progress.done > 0);
    // When both options have ticks, the finished one is what the done row shows and opens.
    const finished = g.routines.find((r) => r.progress.complete);
    return {
      key: g.key,
      timeOfDay: first.timeOfDay,
      customName: first.customName,
      routines: [...g.routines],
      chosenId: finished?.id ?? started?.id ?? g.chosenId,
      started: !!started,
      complete: groupComplete(g.routines.map((r) => r.progress)),
    };
  });
}

/**
 * Today and the player (spec T1, T2): one group per time of day with a routine due on `day`, in
 * time order, with A/B options and the remembered pick. Every step carries its product's status
 * so a finished or expired product can be flagged (refinement 11).
 */
export function getTodayRoutines(db: Db, day: string, warnDays: number): TodayRoutineGroup[] {
  const routines = listRoutines(db, day, warnDays);
  const steps = routines.flatMap((r) => r.steps);
  const choices = db.select().from(routineChoice).all();
  const logs = logsOn(db, day);
  const byId = new Map(routines.map((r) => [r.id, dayRoutine(r, logs.get(r.id) ?? null, day)]));
  return groupDayRoutines(
    todayGroups(routines, steps, day, choices).map((g) => ({
      key: g.key,
      chosenId: g.chosenId,
      routines: g.routines.map((r) => byId.get(r.id)!),
    })),
  );
}

/** One routine on one day, for the player (it may be opened on a day the routine isn't due). */
export function getRoutineDay(
  db: Db,
  id: number,
  day: string,
  warnDays: number,
): DayRoutine | null {
  const r = db.select().from(routine).where(eq(routine.id, id)).get();
  if (!r) return null;
  const steps = loadSteps(db, [id], day, warnDays, 'with');
  return dayRoutine(toItem(r, steps), getDayLog(db, id, day), day);
}

/** Logs of every routine between two app days, inclusive (calendar, streaks). */
export function logsInRange(db: DbOrTx, fromDay: string, toDay: string): RoutineLog[] {
  return db
    .select()
    .from(routineLog)
    .where(and(gte(routineLog.day, fromDay), lte(routineLog.day, toDay)))
    .orderBy(asc(routineLog.day), asc(routineLog.routineId))
    .all();
}

/** Everything `skinStreak()` needs, loaded once. */
export function streakInput(db: DbOrTx, today: string): SkinStreakInput {
  return skinRangeInput(db, today, null, today);
}

/**
 * Routines, steps and the logs from `fromDay` (null: the first) to `toDay`, inclusive, for the
 * skin streak and the calendar statuses (task 028). Deleted routines keep the days before they
 * were deleted. As on Today, steps that no longer count on a day are dropped from its snapshot,
 * so a removed step can never block a day.
 */
export function skinRangeInput(
  db: DbOrTx,
  today: string,
  fromDay: string | null,
  toDay: string,
): SkinStreakInput {
  const routineRows = db.select().from(routine).all();
  const routines = routineRows.map(routineLite);
  const routineDeletedAt = new Map(routineRows.map((r) => [r.id, r.deletedAt]));
  const stepRows = db
    .select({
      id: routineStep.id,
      routineId: routineStep.routineId,
      productId: routineStep.productId,
      position: routineStep.position,
      scheduleKind: routineStep.scheduleKind,
      daysOfWeek: routineStep.daysOfWeek,
      everyNDays: routineStep.everyNDays,
      startDate: routineStep.startDate,
      deletedAt: routineStep.deletedAt,
    })
    .from(routineStep)
    .all();
  // Only steps that aren't deleted are scheduled; past days count deleted ones through logs.
  const steps: StepLite[] = stepRows.flatMap(({ deletedAt, ...s }) =>
    deletedAt === null ? [s] : [],
  );
  const stepCounts = stepCounter(stepRows);
  const logs: RoutineLogLite[] = db
    .select({
      routineId: routineLog.routineId,
      day: routineLog.day,
      dueStepIds: routineLog.dueStepIds,
      doneStepIds: routineLog.doneStepIds,
    })
    .from(routineLog)
    .where(
      fromDay === null
        ? lte(routineLog.day, toDay)
        : and(gte(routineLog.day, fromDay), lte(routineLog.day, toDay)),
    )
    .all()
    .filter((l) => countsOn(routineDeletedAt.get(l.routineId) ?? null, l.day))
    .map((l) => ({ ...l, dueStepIds: l.dueStepIds.filter((id) => stepCounts(id, l.day)) }));
  return { routines, steps, logs, today };
}

/**
 * The R4 picker's Recent group: active products most recently put in a routine step (skin) or a
 * hair task (hair), newest first, up to `limit`.
 */
export function recentStepProducts(
  db: DbOrTx,
  area: 'skin' | 'hair',
  today: string,
  warnDays: number,
  limit = 5,
): PickerProduct[] {
  const ids: number[] = [];
  const push = (id: number | null) => {
    if (id !== null && !ids.includes(id)) ids.push(id);
  };
  if (area === 'skin') {
    for (const s of db
      .select({ productId: routineStep.productId })
      .from(routineStep)
      .where(isNotNull(routineStep.productId))
      .orderBy(desc(routineStep.updatedAt), desc(routineStep.id))
      .all()) {
      push(s.productId);
    }
  } else {
    for (const h of db
      .select({ productIds: hairTask.productIds })
      .from(hairTask)
      .orderBy(desc(hairTask.updatedAt), desc(hairTask.id))
      .all()) {
      for (const id of h.productIds) push(id);
    }
  }
  if (ids.length === 0) return [];
  const rows = new Map(
    db
      .select()
      .from(product)
      .where(inArray(product.id, ids))
      .all()
      .map((p) => [p.id, p]),
  );
  const out: PickerProduct[] = [];
  for (const id of ids) {
    const p = rows.get(id);
    if (!p || p.archivedAt !== null || (p.area !== area && p.area !== 'both')) continue;
    out.push(stepProduct(p, today, warnDays));
    if (out.length === limit) break;
  }
  return out;
}

/** The routines a product is used in, by time (P2 "Used in"); deleted ones don't count. */
export function routinesUsingProduct(db: Db, productId: number): UsedIn[] {
  return db
    .selectDistinct({ id: routine.id, name: routine.name })
    .from(routineStep)
    .innerJoin(routine, eq(routine.id, routineStep.routineId))
    .where(
      and(
        eq(routineStep.productId, productId),
        isNull(routineStep.deletedAt),
        isNull(routine.deletedAt),
      ),
    )
    .orderBy(asc(routine.sortTime), asc(routine.id))
    .all()
    .map((r) => ({ kind: 'routine' as const, id: r.id, name: r.name }));
}

addUsedInSource(routinesUsingProduct);

// ─── Writes ─────────────────────────────────────────────────────────────────

function stepValues(s: StepInput, routineId: number, position: number) {
  return {
    routineId,
    productId: s.productId,
    position,
    note: s.note,
    scheduleKind: s.scheduleKind,
    daysOfWeek: s.daysOfWeek,
    everyNDays: s.everyNDays,
    startDate: s.startDate,
    waitSeconds: s.waitSeconds,
  };
}

type StepValues = ReturnType<typeof stepValues>;
const sameStep = (row: RoutineStep, v: StepValues) =>
  (Object.keys(v) as (keyof StepValues)[]).every(
    (key) => JSON.stringify(row[key]) === JSON.stringify(v[key]),
  );

/**
 * Freezes a routine's past before its schedule changes (days, steps, on or off, deleted), so the
 * change can't rewrite past days or the streak. Every day from the routine's first day to yesterday
 * that is due under its current definition and has no snapshot yet gets a log with that day's due
 * steps and no ticks; a log whose snapshot steps were all deleted gets one too and keeps its ticks,
 * and a snapshot with some deleted steps loses them (a deleted step counts before its day only). Then
 * the routine's first day (`createdAt`) moves to today, so a past day without a log stays empty
 * whatever the new schedule says. Readers already take a day's snapshot over the schedule and skip
 * days before the first day, so no past day reads differently. Call it in the saving transaction.
 */
function freezePastDays(tx: DbOrTx, routineId: number, now: number): void {
  const r = tx.select().from(routine).where(eq(routine.id, routineId)).get();
  if (!r) return;
  const from = appDay(r.createdAt);
  const yesterday = addDays(appDay(now), -1);
  if (from <= yesterday) {
    const all = tx.select().from(routineStep).where(eq(routineStep.routineId, routineId)).all();
    // Every step deletion goes through here first, so none was live after `from`.
    const steps = all.filter((s) => s.deletedAt === null);
    const stepCounts = stepCounter(all);
    const snapshots = new Map(
      tx
        .select({ day: routineLog.day, dueStepIds: routineLog.dueStepIds })
        .from(routineLog)
        .where(
          and(
            eq(routineLog.routineId, routineId),
            gte(routineLog.day, from),
            lte(routineLog.day, yesterday),
          ),
        )
        .all()
        .map((l) => [l.day, l.dueStepIds]),
    );
    const lite = routineLite(r);
    const rows = daysBetween(from, yesterday).flatMap((day) => {
      const snapshot = snapshots.get(day) ?? [];
      const counted = snapshot.filter((id) => stepCounts(id, day));
      // Steps that no longer count leave the snapshot for good, so restoring one can't change it.
      if (counted.length > 0) {
        return counted.length < snapshot.length ? [{ routineId, day, dueStepIds: counted }] : [];
      }
      const due = dueSteps(lite, steps, day).map((s) => s.id);
      return due.length > 0 ? [{ routineId, day, dueStepIds: due }] : [];
    });
    if (rows.length > 0) {
      tx.insert(routineLog)
        .values(rows)
        .onConflictDoUpdate({
          target: [routineLog.routineId, routineLog.day],
          set: { dueStepIds: sql`excluded.due_step_ids` },
        })
        .run();
    }
  }
  if (now > r.createdAt) {
    tx.update(routine).set({ createdAt: now }).where(eq(routine.id, routineId)).run();
  }
}

/**
 * Inserts or updates a routine and its whole step list at once (the editor saves everything
 * together). Steps missing from the list are soft deleted (`deletedAt`), a deleted step back in
 * the list is restored, steps without a known id are inserted and positions are rewritten 0…n. Unchanged steps are left alone so `updatedAt` keeps meaning "last
 * changed" (the picker's Recent group reads it). Saving an existing routine first freezes its past
 * days (`freezePastDays`) as of `now`. Returns the routine id.
 */
export function saveRoutine(db: Db, input: SaveRoutineInput, now: number = Date.now()): number {
  return db.transaction((tx) => {
    const values = {
      name: input.name,
      timeOfDay: input.timeOfDay,
      customName: input.customName,
      sortTime: input.sortTime,
      daysOfWeek: input.daysOfWeek,
      reminderTime: input.reminderTime,
      ...(input.active === undefined ? {} : { active: input.active }),
    };
    let id = input.id ?? null;
    if (id !== null) {
      freezePastDays(tx, id, now);
      tx.update(routine).set(values).where(eq(routine.id, id)).run();
    } else {
      id = tx.insert(routine).values(values).returning({ id: routine.id }).get().id;
    }
    const routineId = id;

    const existing = new Map(
      tx
        .select()
        .from(routineStep)
        .where(eq(routineStep.routineId, routineId))
        .all()
        .map((s) => [s.id, s]),
    );
    const kept = new Set(
      input.steps.flatMap((s) => (s.id != null && existing.has(s.id) ? [s.id] : [])),
    );
    const removed = [...existing.values()]
      .filter((s) => s.deletedAt === null && !kept.has(s.id))
      .map((s) => s.id);
    if (removed.length > 0) {
      tx.update(routineStep).set({ deletedAt: now }).where(inArray(routineStep.id, removed)).run();
    }

    input.steps.forEach((s, position) => {
      const v = stepValues(s, routineId, position);
      const row = s.id != null ? existing.get(s.id) : undefined;
      if (!row) tx.insert(routineStep).values(v).run();
      else if (row.deletedAt !== null || !sameStep(row, v))
        tx.update(routineStep)
          .set({ ...v, deletedAt: null })
          .where(eq(routineStep.id, row.id))
          .run();
    });
    return routineId;
  });
}

/** Switches a routine on or off from today; its past days keep how they read (`freezePastDays`). */
export function setRoutineActive(
  db: Db,
  id: number,
  active: boolean,
  now: number = Date.now(),
): void {
  db.transaction((tx) => {
    freezePastDays(tx, id, now);
    tx.update(routine).set({ active }).where(eq(routine.id, id)).run();
  });
}

/**
 * "Duplicate as variant" (R1): copies the routine and its steps with the name from `makeName`
 * (the caller translates "{{name}} (copy)") and the reminder off. Returns the new id.
 */
export function duplicateRoutine(db: Db, id: number, makeName: (name: string) => string): number {
  return db.transaction((tx) => {
    const r = tx.select().from(routine).where(eq(routine.id, id)).get();
    if (!r) throw new Error(`Routine ${id} not found`);
    const { id: newId } = tx
      .insert(routine)
      .values({
        name: makeName(r.name),
        timeOfDay: r.timeOfDay,
        customName: r.customName,
        sortTime: r.sortTime,
        daysOfWeek: r.daysOfWeek,
        reminderTime: null,
        active: r.active,
      })
      .returning({ id: routine.id })
      .get();
    const steps = tx
      .select()
      .from(routineStep)
      .where(and(eq(routineStep.routineId, id), isNull(routineStep.deletedAt)))
      .orderBy(asc(routineStep.position), asc(routineStep.id))
      .all();
    if (steps.length > 0) {
      tx.insert(routineStep)
        .values(
          steps.map(({ id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, ...s }, position) => ({
            ...s,
            routineId: newId,
            position,
          })),
        )
        .run();
    }
    return newId;
  });
}

/**
 * Deletes a routine softly: it leaves Routines, Today, the player and reminders from today, and
 * the days before keep their history (`freezePastDays`) until `restoreRoutine` brings it back.
 */
export function deleteRoutine(db: Db, id: number, now: number = Date.now()): void {
  db.transaction((tx) => {
    freezePastDays(tx, id, now);
    tx.update(routine).set({ deletedAt: now }).where(eq(routine.id, id)).run();
  });
}

/**
 * Brings a deleted routine back as it was. Its schedule starts again today (`createdAt`), so the
 * days it was deleted stay empty.
 */
export function restoreRoutine(db: Db, id: number, now: number = Date.now()): void {
  db.update(routine)
    .set({ deletedAt: null, createdAt: sql`max(${routine.createdAt}, ${now})` })
    .where(eq(routine.id, id))
    .run();
}

/** "Pick another" (T2) and replacing missing steps (sequence 7). */
export function replaceStepProduct(db: Db, stepId: number, productId: number | null): void {
  db.update(routineStep).set({ productId }).where(eq(routineStep.id, stepId)).run();
}

/** The ticked step ids after ticking (`done`) or unticking `stepIds`, in tick order. */
export function nextDoneIds(
  previous: readonly number[],
  stepIds: readonly number[],
  done: boolean,
): number[] {
  const out = previous.filter((id) => done || !stepIds.includes(id));
  if (done) for (const id of stepIds) if (!out.includes(id)) out.push(id);
  return out;
}

/**
 * Ticks (`done`) or unticks steps on a day. The first tick creates the log with the `dueStepIds`
 * snapshot, which later edits to the routine never change; steps deleted since are dropped from
 * it so they can't block the day. `completedAt` is set when every due step is done and cleared
 * when one is unticked. Returns the log, or null when unticking a day that has none.
 */
export function tickSteps(
  db: Db,
  routineId: number,
  stepIds: readonly number[],
  day: string,
  done: boolean,
  dueStepIds: readonly number[],
  now: number = Date.now(),
): RoutineLog | null {
  return db.transaction((tx) => {
    const log = getDayLog(tx, routineId, day);
    if (!log && !done) return null;

    const doneIds = nextDoneIds(log?.doneStepIds ?? [], stepIds, done);

    const stepCounts = stepCounter(
      tx
        .select({ id: routineStep.id, deletedAt: routineStep.deletedAt })
        .from(routineStep)
        .where(eq(routineStep.routineId, routineId))
        .all(),
    );
    // As `dayRoutine` reads it: the snapshot minus steps that no longer count that day, or the
    // caller's due steps when none of the snapshot is left.
    const fromLog = (log?.dueStepIds ?? []).filter((id) => stepCounts(id, day));
    const due = fromLog.length > 0 ? fromLog : dueStepIds.filter((id) => stepCounts(id, day));
    const complete = due.length > 0 && due.every((id) => doneIds.includes(id));
    const values = {
      dueStepIds: due,
      doneStepIds: doneIds,
      completedAt: complete ? (log?.completedAt ?? now) : null,
    };

    if (!log) {
      return tx
        .insert(routineLog)
        .values({ routineId, day, ...values })
        .returning()
        .get();
    }
    return tx.update(routineLog).set(values).where(eq(routineLog.id, log.id)).returning().get();
  });
}

/** Remembers the A/B pick for a time of day on a weekday (T1). */
export function setChoice(db: Db, timeOfDayKey: string, weekday: number, routineId: number): void {
  db.insert(routineChoice)
    .values({ timeOfDayKey, weekday, routineId })
    .onConflictDoUpdate({
      target: [routineChoice.timeOfDayKey, routineChoice.weekday],
      set: { routineId },
    })
    .run();
}

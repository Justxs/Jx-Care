import { and, asc, desc, eq, gte, inArray, lt, lte, or } from 'drizzle-orm';

import type { Db } from '@/db';
import { hairTags, photoAngles, skinTags, type ProgressArea, type TimeOfDay } from '@/db/enums';
import {
  conditionLog,
  hairLog,
  hairTask,
  product,
  progressEntry,
  progressPhoto,
  routine,
  routineLog,
  routineStep,
  type ProgressPhoto,
} from '@/db/schema';
import { addDays, appDay, daysBetween, minDay, momentOf, weekStart as weekOf } from '@/lib/appDay';
import { groupBy, type RoutineLite, type StepLite } from '@/lib/schedule';
import { createSkinIndex, groupComplete } from '@/lib/streak';

import type {
  CheckInInput,
  DayPhoto,
  LastPhoto,
  ProductChange,
  ProgressFileStore,
  ProgressFiles,
  RoutineWeekCount,
  SaveCheckInInput,
  TimelineTile,
  WeekContext,
  WeekEntry,
  WeekStatus,
} from './types';

/** Progress photo repository (spec C2–C7, task 035). Files are passed in, so tests use a fake. */

const angleRank = (angle: string) => {
  const i = (photoAngles as readonly string[]).indexOf(angle);
  return i < 0 ? photoAngles.length : i;
};

const byAngle = (a: ProgressPhoto, b: ProgressPhoto) =>
  angleRank(a.angle) - angleRank(b.angle) || a.id - b.id;

/** The photo a tile shows: front, else the first tracked angle. */
function coverPhoto(photos: readonly ProgressPhoto[]): ProgressPhoto | null {
  return [...photos].sort(byAngle)[0] ?? null;
}

function findEntry(db: Db, area: ProgressArea, weekStart: string) {
  return db
    .select()
    .from(progressEntry)
    .where(and(eq(progressEntry.area, area), eq(progressEntry.weekStart, weekStart)))
    .get();
}

function photosOf(db: Db, entryIds: number[]): ProgressPhoto[] {
  if (entryIds.length === 0) return [];
  return db.select().from(progressPhoto).where(inArray(progressPhoto.entryId, entryIds)).all();
}

/** Runs file deletions after a commit; a missing or locked file never undoes the change. */
function safely(fn: () => void): void {
  try {
    fn();
  } catch {
    // An orphaned file at worst.
  }
}

function cleanTags(tags: readonly string[]): string[] {
  return [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
}

function cleanRating(rating: number | null): number | null {
  if (rating === null || !Number.isFinite(rating)) return null;
  return Math.min(5, Math.max(1, Math.round(rating)));
}

// ─── Reads ──────────────────────────────────────────────────────────────────

/** The week's entry with its photos in angle order, or null. */
export function getWeekEntry(db: Db, area: ProgressArea, weekStart: string): WeekEntry | null {
  const entry = findEntry(db, area, weekStart);
  if (!entry) return null;
  const photos = photosOf(db, [entry.id]).sort(byAngle);
  const map: WeekEntry['byAngle'] = {};
  for (const p of photos) map[p.angle] ??= p;
  return { ...entry, photos, byAngle: map };
}

/**
 * One tile per week, newest first, from the first entry's week to `thisWeek` (the Monday of the
 * week that holds today), including weeks with no entry ("No photo") and skipped weeks.
 * Empty when nothing was ever saved or skipped.
 */
export function listTimeline(db: Db, area: ProgressArea, thisWeek: string): TimelineTile[] {
  const entries = db
    .select()
    .from(progressEntry)
    .where(eq(progressEntry.area, area))
    .orderBy(asc(progressEntry.weekStart))
    .all();
  const first = entries[0];
  if (!first) return [];
  const photosByEntry = groupBy(
    photosOf(
      db,
      entries.map((e) => e.id),
    ),
    (p) => p.entryId,
  );
  const byWeek = new Map(entries.map((e) => [weekOf(e.weekStart), e]));
  const current = weekOf(thisWeek);
  const last = entries.reduce(
    (max, e) => (weekOf(e.weekStart) > max ? weekOf(e.weekStart) : max),
    current,
  );
  const start = weekOf(first.weekStart);

  const tiles: TimelineTile[] = [];
  for (let week = last; week >= start; week = addDays(week, -7)) {
    const entry = byWeek.get(week);
    const photos = entry ? (photosByEntry.get(entry.id) ?? []) : [];
    const cover = coverPhoto(photos);
    const taken = photos.length > 0;
    tiles.push({
      weekStart: week,
      entryId: entry?.id ?? null,
      status: taken ? 'taken' : entry?.skipped ? 'skipped' : 'empty',
      photo: cover ? { id: cover.id, angle: cover.angle, fileUri: cover.fileUri } : null,
      photoCount: photos.length,
      takenAt: taken ? (entry?.takenAt ?? null) : null,
      takenDay: taken && entry?.takenAt != null ? appDay(entry.takenAt) : null,
      current: week === current,
    });
  }
  return tiles;
}

/** The latest photo of `angle` from a week before `beforeWeek`: the camera's guide (C4). */
export function lastPhoto(
  db: Db,
  area: ProgressArea,
  angle: ProgressPhoto['angle'],
  beforeWeek: string,
): LastPhoto | null {
  const row = db
    .select({
      id: progressPhoto.id,
      angle: progressPhoto.angle,
      fileUri: progressPhoto.fileUri,
      entryId: progressEntry.id,
      weekStart: progressEntry.weekStart,
      takenAt: progressEntry.takenAt,
    })
    .from(progressPhoto)
    .innerJoin(progressEntry, eq(progressPhoto.entryId, progressEntry.id))
    .where(
      and(
        eq(progressEntry.area, area),
        eq(progressPhoto.angle, angle),
        lt(progressEntry.weekStart, beforeWeek),
      ),
    )
    .orderBy(desc(progressEntry.weekStart), desc(progressPhoto.id))
    .limit(1)
    .get();
  return row ?? null;
}

/** Weekly photos taken on an app day, skin first (C2 "Skin photo, taken 6 Oct."). */
export function photoForDay(db: Db, day: string): DayPhoto[] {
  const from = momentOf(day, '04:00');
  const to = momentOf(addDays(day, 1), '04:00');
  const entries = db
    .select()
    .from(progressEntry)
    .where(and(gte(progressEntry.takenAt, from), lt(progressEntry.takenAt, to)))
    .all();
  const photosByEntry = groupBy(
    photosOf(
      db,
      entries.map((e) => e.id),
    ),
    (p) => p.entryId,
  );
  const out: DayPhoto[] = [];
  for (const e of entries) {
    const cover = coverPhoto(photosByEntry.get(e.id) ?? []);
    if (!cover || e.takenAt == null) continue;
    out.push({
      area: e.area,
      entryId: e.id,
      weekStart: e.weekStart,
      takenAt: e.takenAt,
      photo: { id: cover.id, angle: cover.angle, fileUri: cover.fileUri },
    });
  }
  return out.sort((a, b) =>
    a.area === b.area ? a.takenAt - b.takenAt : a.area === 'skin' ? -1 : 1,
  );
}

/** This week's photo: taken, skipped or still due (Today's check-in row and the reminder). */
export function thisWeekStatus(db: Db, area: ProgressArea, today: string): WeekStatus {
  const entry = findEntry(db, area, weekOf(today));
  if (!entry) return 'due';
  if (photosOf(db, [entry.id]).length > 0) return 'taken';
  return entry.skipped ? 'skipped' : 'due';
}

// ─── Writes ─────────────────────────────────────────────────────────────────

/**
 * Saves a week's check-in: inserts the entry or replaces it (retake, C6) together with its photo
 * rows in one transaction. Photo files the new set no longer uses are deleted after the commit.
 */
export function saveCheckIn(
  db: Db,
  input: CheckInInput,
  files: ProgressFileStore,
  now: number = Date.now(),
): { entryId: number; replaced: string[] } {
  const values = {
    takenAt: input.takenAt ?? now,
    skipped: false,
    rating: cleanRating(input.rating),
    tags: cleanTags(input.tags),
    note: input.note?.trim() || null,
  };
  const result = db.transaction((tx) => {
    const existing = tx
      .select()
      .from(progressEntry)
      .where(and(eq(progressEntry.area, input.area), eq(progressEntry.weekStart, input.weekStart)))
      .get();
    let entryId: number;
    let old: string[] = [];
    if (existing) {
      entryId = existing.id;
      old = tx
        .select({ fileUri: progressPhoto.fileUri })
        .from(progressPhoto)
        .where(eq(progressPhoto.entryId, entryId))
        .all()
        .map((p) => p.fileUri);
      tx.delete(progressPhoto).where(eq(progressPhoto.entryId, entryId)).run();
      tx.update(progressEntry).set(values).where(eq(progressEntry.id, entryId)).run();
    } else {
      entryId = tx
        .insert(progressEntry)
        .values({ area: input.area, weekStart: input.weekStart, ...values })
        .returning({ id: progressEntry.id })
        .get().id;
    }
    if (input.photos.length > 0) {
      tx.insert(progressPhoto)
        .values(input.photos.map((p) => ({ entryId, angle: p.angle, fileUri: p.fileUri })))
        .run();
    }
    const keep = new Set(input.photos.map((p) => p.fileUri));
    return { entryId, replaced: old.filter((uri) => !keep.has(uri)) };
  });
  for (const uri of result.replaced) safely(() => files.deletePhotoFile(uri));
  return result;
}

/**
 * Saves the review (C5): copies new camera photos into private storage, then writes the entry
 * with `saveCheckIn`. If anything fails, the files it just saved are removed again.
 */
export async function saveCheckInWithFiles(
  db: Db,
  input: SaveCheckInInput,
  files: ProgressFiles,
  now: number = Date.now(),
): Promise<{ entryId: number }> {
  const created: string[] = [];
  try {
    const photos: CheckInInput['photos'] = [];
    for (const p of input.photos) {
      if (files.isProgressFile(p.uri)) {
        photos.push({ angle: p.angle, fileUri: p.uri });
        continue;
      }
      const target = { area: input.area, weekStart: input.weekStart, angle: p.angle };
      const fileUri = await files.savePhoto(p.uri, target, now);
      created.push(fileUri);
      photos.push({ angle: p.angle, fileUri });
    }
    const { entryId } = saveCheckIn(db, { ...input, photos, takenAt: now }, files, now);
    return { entryId };
  } catch (error) {
    for (const uri of created) safely(() => files.deletePhotoFile(uri));
    throw error;
  }
}

/**
 * "Skip this week" on Today and the notification: an entry with `skipped` and no photos.
 * A week that already has photos stays as it is.
 */
export function skipWeek(db: Db, area: ProgressArea, weekStart: string): number {
  return db.transaction((tx) => {
    const existing = tx
      .select()
      .from(progressEntry)
      .where(and(eq(progressEntry.area, area), eq(progressEntry.weekStart, weekStart)))
      .get();
    if (!existing) {
      return tx
        .insert(progressEntry)
        .values({ area, weekStart, skipped: true })
        .returning({ id: progressEntry.id })
        .get().id;
    }
    const hasPhotos = tx
      .select({ id: progressPhoto.id })
      .from(progressPhoto)
      .where(eq(progressPhoto.entryId, existing.id))
      .get();
    if (!hasPhotos && !existing.skipped) {
      tx.update(progressEntry)
        .set({ skipped: true })
        .where(eq(progressEntry.id, existing.id))
        .run();
    }
    return existing.id;
  });
}

/**
 * Deletes one photo and its file. When it was the week's last photo the whole week goes, so no
 * empty entry is left behind. Returns null when the photo doesn't exist.
 */
export function deletePhoto(
  db: Db,
  photoId: number,
  files: ProgressFileStore,
): { entryDeleted: boolean } | null {
  const result = db.transaction((tx) => {
    const photo = tx.select().from(progressPhoto).where(eq(progressPhoto.id, photoId)).get();
    if (!photo) return null;
    const entry = tx.select().from(progressEntry).where(eq(progressEntry.id, photo.entryId)).get();
    tx.delete(progressPhoto).where(eq(progressPhoto.id, photoId)).run();
    const left = tx
      .select({ id: progressPhoto.id })
      .from(progressPhoto)
      .where(eq(progressPhoto.entryId, photo.entryId))
      .get();
    const entryDeleted = !left && !!entry;
    if (entryDeleted) tx.delete(progressEntry).where(eq(progressEntry.id, photo.entryId)).run();
    return { photo, entry, entryDeleted };
  });
  if (!result) return null;
  safely(() => files.deletePhotoFile(result.photo.fileUri));
  if (result.entryDeleted && result.entry) {
    const { area, weekStart } = result.entry;
    safely(() => files.deleteWeekFolder(area, weekStart));
  }
  return { entryDeleted: result.entryDeleted };
}

/** Deletes a week's entry, its photo rows, its files and its folder. */
export function deleteWeek(db: Db, entryId: number, files: ProgressFileStore): boolean {
  const result = db.transaction((tx) => {
    const entry = tx.select().from(progressEntry).where(eq(progressEntry.id, entryId)).get();
    if (!entry) return null;
    const uris = tx
      .select({ fileUri: progressPhoto.fileUri })
      .from(progressPhoto)
      .where(eq(progressPhoto.entryId, entryId))
      .all()
      .map((p) => p.fileUri);
    tx.delete(progressEntry).where(eq(progressEntry.id, entryId)).run();
    return { entry, uris };
  });
  if (!result) return false;
  for (const uri of result.uris) safely(() => files.deletePhotoFile(uri));
  safely(() => files.deleteWeekFolder(result.entry.area, result.entry.weekStart));
  return true;
}

// ─── Week context (C6) ──────────────────────────────────────────────────────

const timeOfDayRank: Record<TimeOfDay, number> = { morning: 0, evening: 1, custom: 2 };

function routineCounts(db: Db, days: string[]): RoutineWeekCount[] {
  if (days.length === 0) return [];
  const routines: RoutineLite[] = db
    .select()
    .from(routine)
    .all()
    .map((r) => ({
      id: r.id,
      name: r.name,
      timeOfDay: r.timeOfDay,
      customName: r.customName,
      sortTime: r.sortTime,
      daysOfWeek: r.daysOfWeek,
      active: r.active,
      createdDay: appDay(r.createdAt),
    }));
  if (routines.length === 0) return [];
  const steps: StepLite[] = db
    .select({
      id: routineStep.id,
      routineId: routineStep.routineId,
      productId: routineStep.productId,
      position: routineStep.position,
      scheduleKind: routineStep.scheduleKind,
      daysOfWeek: routineStep.daysOfWeek,
      everyNDays: routineStep.everyNDays,
      startDate: routineStep.startDate,
    })
    .from(routineStep)
    .all();
  const logs = db
    .select({
      routineId: routineLog.routineId,
      day: routineLog.day,
      dueStepIds: routineLog.dueStepIds,
      doneStepIds: routineLog.doneStepIds,
    })
    .from(routineLog)
    .where(inArray(routineLog.day, days))
    .all();
  const today = days[days.length - 1]!;
  const index = createSkinIndex({ routines, steps, logs, today });

  const counts = new Map<string, RoutineWeekCount & { sortTime: string }>();
  for (const day of days) {
    for (const [key, group] of index.evaluate(day).groups) {
      const first = group[0]!.routine;
      const row = counts.get(key) ?? {
        key,
        timeOfDay: first.timeOfDay,
        customName: first.customName,
        sortTime: first.sortTime,
        done: 0,
        due: 0,
      };
      row.due += 1;
      if (groupComplete(group)) row.done += 1;
      counts.set(key, row);
    }
  }
  return [...counts.values()]
    .sort(
      (a, b) =>
        timeOfDayRank[a.timeOfDay] - timeOfDayRank[b.timeOfDay] ||
        a.sortTime.localeCompare(b.sortTime) ||
        a.key.localeCompare(b.key),
    )
    .map(({ sortTime: _sortTime, ...rest }) => rest);
}

function hairCounts(db: Db, from: string, to: string): WeekContext['hairTasks'] {
  const rows = db
    .select({ taskId: hairLog.hairTaskId, name: hairTask.name })
    .from(hairLog)
    .innerJoin(hairTask, eq(hairLog.hairTaskId, hairTask.id))
    .where(and(gte(hairLog.day, from), lte(hairLog.day, to)))
    .orderBy(asc(hairTask.id))
    .all();
  const out = new Map<number, WeekContext['hairTasks'][number]>();
  for (const r of rows) {
    const row = out.get(r.taskId) ?? { taskId: r.taskId, name: r.name, done: 0 };
    row.done += 1;
    out.set(r.taskId, row);
  }
  return [...out.values()];
}

function productChanges(
  db: Db,
  area: ProgressArea,
  column: typeof product.openedAt | typeof product.archivedAt,
  from: string,
  to: string,
): ProductChange[] {
  return db
    .select({ id: product.id, name: product.name, brand: product.brand, day: column })
    .from(product)
    .where(
      and(or(eq(product.area, area), eq(product.area, 'both')), gte(column, from), lte(column, to)),
    )
    .orderBy(asc(column), asc(product.id))
    .all()
    .map((p) => ({ ...p, day: p.day as string }));
}

function conditionSummary(
  db: Db,
  area: ProgressArea,
  from: string,
  to: string,
): WeekContext['condition'] {
  const logs = db
    .select({ states: conditionLog.states })
    .from(conditionLog)
    .where(and(eq(conditionLog.area, area), gte(conditionLog.day, from), lte(conditionLog.day, to)))
    .all();
  const counts = new Map<string, number>();
  for (const log of logs)
    for (const s of new Set(log.states)) counts.set(s, (counts.get(s) ?? 0) + 1);
  const order: readonly string[] = area === 'hair' ? hairTags : skinTags;
  const rank = (tag: string) => (order.includes(tag) ? order.indexOf(tag) : order.length);
  const tags = [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || rank(a.tag) - rank(b.tag) || a.tag.localeCompare(b.tag));
  return { daysLogged: logs.filter((l) => l.states.length > 0).length, tags };
}

/**
 * C6 "What changed this week" for the week starting `weekStart`: routines done out of due per
 * time of day (skin) or hair tasks done (hair), products started (opened) and stopped
 * (finished) that week, and the condition log summary. A running week counts up to `today`.
 */
export function weekContext(
  db: Db,
  area: ProgressArea,
  weekStart: string,
  today: string,
): WeekContext {
  const from = weekOf(weekStart);
  const end = addDays(from, 6);
  const to = minDay(end, today);
  const days = to >= from ? daysBetween(from, to) : [];
  return {
    days: days.length,
    routines: area === 'skin' ? routineCounts(db, days) : [],
    hairTasks: area === 'hair' && days.length > 0 ? hairCounts(db, from, to) : [],
    started: productChanges(db, area, product.openedAt, from, end),
    stopped: productChanges(db, area, product.archivedAt, from, end),
    condition: days.length > 0 ? conditionSummary(db, area, from, to) : { daysLogged: 0, tags: [] },
  };
}

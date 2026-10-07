import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';

import type { Db, DbOrTx } from '@/db';
import type { ConditionArea, SkinTag } from '@/db/enums';
import { conditionLog } from '@/db/schema';

import {
  bySeverity,
  cleanEntry,
  isTagOf,
  tagsFor,
  toggleInDay,
  type ConditionDay,
  type ConditionEntry,
} from './tags';

/** The condition log (T4, C1 Condition view, C2): one row per day and area. */

export type ConditionSummaryArea = {
  /** Days with at least one tag. */
  daysLogged: number;
  /** Every tag logged, with the days it was logged on; most frequent first, ties in standard order. */
  tags: { tag: string; count: number }[];
};

export type ConditionSummary = Record<ConditionArea, ConditionSummaryArea>;

/** Per grid day, the skin states logged, in severity order (days without any are left out). */
export type ConditionMonth = Record<string, SkinTag[]>;

/** The skin and hair logs of a day; an area is missing when nothing is logged for it. */
export function getConditionDay(db: DbOrTx, day: string): ConditionDay {
  const rows = db
    .select({ area: conditionLog.area, states: conditionLog.states, note: conditionLog.note })
    .from(conditionLog)
    .where(eq(conditionLog.day, day))
    .all();
  const out: ConditionDay = {};
  for (const row of rows) out[row.area] = { states: row.states, note: row.note };
  return out;
}

/** Writes one area of a day: upserts the row, or deletes it when it holds nothing. */
function writeEntry(
  db: DbOrTx,
  day: string,
  area: ConditionArea,
  entry: ConditionEntry | null | undefined,
): void {
  const clean = cleanEntry(area, entry);
  if (!clean) {
    db.delete(conditionLog)
      .where(and(eq(conditionLog.day, day), eq(conditionLog.area, area)))
      .run();
    return;
  }
  db.insert(conditionLog)
    .values({ day, area, states: clean.states, note: clean.note })
    .onConflictDoUpdate({
      target: [conditionLog.day, conditionLog.area],
      set: { states: clean.states, note: clean.note, updatedAt: Date.now() },
    })
    .run();
}

/**
 * Switches one tag on or off for a day (the Today chips). Creates the row on the first tag,
 * updates it after, and deletes it once it has no tags and no note. Returns the day.
 */
export function toggleState(db: Db, day: string, area: ConditionArea, state: string): ConditionDay {
  if (!isTagOf(area, state)) throw new Error(`Unknown ${area} tag: ${state}`);
  return db.transaction((tx) => {
    const next = toggleInDay(getConditionDay(tx, day), area, state);
    writeEntry(tx, day, area, next[area]);
    return next;
  });
}

/**
 * Saves the T4 sheet: each area given replaces that area's log (null or empty deletes it); an
 * area left out stays as it is. Tags keep the standard order; the note is cut to 280.
 */
export function saveConditionDay(
  db: Db,
  day: string,
  input: { skin?: ConditionEntry | null; hair?: ConditionEntry | null },
): ConditionDay {
  return db.transaction((tx) => {
    for (const area of ['skin', 'hair'] as const) {
      if (area in input) writeEntry(tx, day, area, input[area]);
    }
    return getConditionDay(tx, day);
  });
}

/** C1 Condition view: the skin states of each of `days` that has any, in severity order. */
export function conditionMonth(db: Db, days: readonly string[]): ConditionMonth {
  if (days.length === 0) return {};
  const rows = db
    .select({ day: conditionLog.day, states: conditionLog.states })
    .from(conditionLog)
    .where(and(eq(conditionLog.area, 'skin'), inArray(conditionLog.day, [...days])))
    .all();
  const out: ConditionMonth = {};
  for (const row of rows) {
    const states = bySeverity(row.states);
    if (states.length > 0) out[row.day] = states;
  }
  return out;
}

/**
 * Skin and hair tags logged from `fromDay` to `toDay` (inclusive): the days with any tag and
 * each tag's count, most frequent first (task 035's "What changed this week").
 */
export function conditionSummary(db: Db, fromDay: string, toDay: string): ConditionSummary {
  const rows = db
    .select({ area: conditionLog.area, states: conditionLog.states })
    .from(conditionLog)
    .where(and(gte(conditionLog.day, fromDay), lte(conditionLog.day, toDay)))
    .orderBy(asc(conditionLog.day))
    .all();
  const summarise = (area: ConditionArea): ConditionSummaryArea => {
    const logs = rows.filter((r) => r.area === area);
    const counts = new Map<string, number>();
    for (const log of logs) {
      for (const s of new Set(log.states)) counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    const order: readonly string[] = tagsFor(area);
    const rank = (tag: string) => (order.includes(tag) ? order.indexOf(tag) : order.length);
    const tags = [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || rank(a.tag) - rank(b.tag) || a.tag.localeCompare(b.tag));
    return { daysLogged: logs.filter((l) => l.states.length > 0).length, tags };
  };
  return { skin: summarise('skin'), hair: summarise('hair') };
}

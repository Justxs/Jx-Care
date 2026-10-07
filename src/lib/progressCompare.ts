import { photoAngles, type PhotoAngle } from '@/db/enums';

import { addDays, diffDays } from './appDay';

/**
 * Rules for Compare (C7): which two weeks it opens with, the "4 weeks ago vs now" pair, the
 * angles both weeks have and the slider's position. Weeks are the Mondays of weeks with photos.
 */

/** Weeks newest first, without duplicates. */
function newestFirst(weeks: readonly string[]): string[] {
  return [...new Set(weeks)].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

/**
 * The week with photos closest to four weeks before `after`, among the weeks before it; on a tie
 * the older one. Null when no week is older than `after`.
 */
export function fourWeeksBefore(weeks: readonly string[], after: string): string | null {
  const target = addDays(after, -28);
  let best: string | null = null;
  let bestGap = Infinity;
  for (const week of newestFirst(weeks)) {
    if (week >= after) continue;
    const gap = Math.abs(diffDays(week, target));
    // Newest first, so `<=` lets the older week win a tie.
    if (gap <= bestGap) {
      best = week;
      bestGap = gap;
    }
  }
  return best;
}

export type ComparePair = { before: string; after: string };

/** "4 weeks ago vs now": the newest week against the one closest to four weeks before it. */
export function fourWeeksPair(weeks: readonly string[]): ComparePair | null {
  const after = newestFirst(weeks)[0];
  if (!after) return null;
  const before = fourWeeksBefore(weeks, after);
  return before ? { before, after } : null;
}

/**
 * The pair Compare opens with. A requested After (Week detail's "Compare with…") or Before is
 * kept when it has photos; otherwise After is the newest week and Before the one closest to four
 * weeks earlier (or the nearest other week). Null with fewer than two weeks.
 */
export function initialPair(
  weeks: readonly string[],
  requested: { before?: string | null; after?: string | null } = {},
): ComparePair | null {
  const list = newestFirst(weeks);
  if (list.length < 2) return null;
  const after =
    requested.after && list.includes(requested.after) ? requested.after : (list[0] as string);
  if (requested.before && requested.before !== after && list.includes(requested.before)) {
    return { before: requested.before, after };
  }
  // With no older week (After is the oldest), the next newer one stands in.
  const before = fourWeeksBefore(list, after) ?? list[list.indexOf(after) - 1] ?? null;
  return before ? { before, after } : null;
}

/**
 * Picking a week for one side. Picking the week the other side shows swaps the two, so the
 * sides never show the same week.
 */
export function pickWeek(pair: ComparePair, side: keyof ComparePair, week: string): ComparePair {
  const other: keyof ComparePair = side === 'before' ? 'after' : 'before';
  if (pair[other] === week) return { [side]: week, [other]: pair[side] } as ComparePair;
  return { ...pair, [side]: week };
}

/** The angles both weeks have, in the standard order (Front, Left side, Right side, Back, Top). */
export function sharedAngles(a: readonly PhotoAngle[], b: readonly PhotoAngle[]): PhotoAngle[] {
  return photoAngles.filter((angle) => a.includes(angle) && b.includes(angle));
}

/** The slider's position as a share of the width, kept inside 0–1. */
export function clampShare(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

/** One accessibility step of the slider: 10% of the width, rounded to whole tens. */
export function stepShare(value: number, direction: 1 | -1): number {
  return clampShare(Math.round(value * 10 + direction) / 10);
}

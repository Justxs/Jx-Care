import type { DbOrTx } from '@/db';
import type { Routine } from '@/db/schema';
import {
  dayRoutine,
  listRoutines,
  logsInRange,
  skinRangeInput,
  type DayRoutine,
} from '@/features/routines/repo';
import { diffDays } from '@/lib/appDay';
import { timeOfDayKey } from '@/lib/schedule';
import { skinDayStatus, skinDayStatuses, type SkinDayStatus } from '@/lib/streak';

/** C1 Skin view: a status for each of the grid's 42 days. */
export type SkinMonth = {
  statuses: Record<string, SkinDayStatus>;
  /** Any skin routine exists (active or not); without one the grid shows the empty line. */
  hasRoutines: boolean;
};

/** Statuses for the grid days in one go: routines, steps and the logs in the grid's range. */
export function getSkinMonth(db: DbOrTx, days: readonly string[], today: string): SkinMonth {
  if (days.length === 0) return { statuses: {}, hasRoutines: false };
  const input = skinRangeInput(db, today, days[0]!, days[days.length - 1]!);
  const statuses: Record<string, SkinDayStatus> = {};
  for (const [day, status] of skinDayStatuses(days, input)) statuses[day] = status;
  return { statuses, hasRoutines: input.routines.length > 0 };
}

/** One time of day on C2, with the routines it shows. */
export type SkinDayGroup = {
  key: string;
  timeOfDay: Routine['timeOfDay'];
  customName: string | null;
  /** The A/B options started that day; every option when none was started. */
  routines: DayRoutine[];
};

/** C2 Skin routines: what was due on a day and what was ticked. */
export type SkinDay = {
  day: string;
  status: SkinDayStatus;
  groups: SkinDayGroup[];
};

/**
 * The skin routines due on `day`, by time of day, each with its due steps (the day's snapshot
 * once it has a tick) and log. A routine counts on the same terms as the calendar mark: it has a
 * snapshot that day, or it existed and had steps due. Of two A/B options, only the one started
 * is shown, so the other never reads "Not done".
 */
export function getSkinDay(db: DbOrTx, day: string, today: string, warnDays: number): SkinDay {
  const logs = new Map(logsInRange(db, day, day).map((l) => [l.routineId, l]));
  const shown: DayRoutine[] = [];
  for (const r of listRoutines(db, today, warnDays)) {
    const log = logs.get(r.id) ?? null;
    const hasSnapshot = !!log && log.dueStepIds.length > 0;
    if (!hasSnapshot && day < r.createdDay) continue;
    const d = dayRoutine(r, log, day);
    if (d.progress.due > 0) shown.push(d);
  }

  const byKey = new Map<string, DayRoutine[]>();
  for (const r of shown) {
    const key = timeOfDayKey(r);
    byKey.set(key, [...(byKey.get(key) ?? []), r]);
  }
  const groups = [...byKey.entries()].map(([key, routines]) => {
    const started = routines.filter((r) => r.progress.done > 0);
    const first = routines[0]!;
    return {
      key,
      timeOfDay: first.timeOfDay,
      customName: first.customName,
      routines: started.length > 0 ? started : routines,
    };
  });
  // listRoutines is ordered by time then id, so the groups already are.

  return { day, status: skinDayStatus(day, skinRangeInput(db, today, day, day)), groups };
}

/** How many days back (today included) a day can still be changed on C2. */
const EDIT_WINDOW_DAYS = 7;

/** C2 edits: today and the six days before it; older days and future days are read-only. */
export function canEditDay(day: string, today: string): boolean {
  const back = diffDays(today, day);
  return back >= 0 && back < EDIT_WINDOW_DAYS;
}

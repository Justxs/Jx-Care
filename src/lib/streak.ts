import { addDays, minDay } from './appDay';
import {
  groupBy,
  routineProgress,
  timeOfDayKey,
  type RoutineLite,
  type RoutineLogLite,
  type StepLite,
} from './schedule';

/** Skin day status and streak (spec C1; plan decisions "Calendar day colours", "Skin streak"). */

export type SkinStreakInput = {
  routines: readonly RoutineLite[];
  steps: readonly StepLite[];
  logs: readonly RoutineLogLite[];
  today: string;
};

export type SkinDayStatus = 'none' | 'done' | 'partly' | 'missed' | 'pending';

export type Streak = { current: number; best: number };

type DayRoutine = { routine: RoutineLite; due: number; done: number; complete: boolean };
type DayEval = { groups: Map<string, DayRoutine[]> };

/** Precomputed lookups so a day costs O(routines). */
export function createSkinIndex(input: SkinStreakInput) {
  const stepsByRoutine = groupBy(input.steps, (s) => s.routineId);
  const logByKey = new Map<string, RoutineLogLite>();
  for (const log of input.logs) logByKey.set(`${log.routineId}|${log.day}`, log);

  const evaluate = (day: string): DayEval => {
    const groups = new Map<string, DayRoutine[]>();
    for (const routine of input.routines) {
      const log = logByKey.get(`${routine.id}|${day}`);
      const hasSnapshot = !!log && log.dueStepIds.length > 0;
      if (!hasSnapshot && day < routine.createdDay) continue;
      const progress = routineProgress(routine, stepsByRoutine.get(routine.id) ?? [], log, day);
      if (progress.due === 0) continue;
      const key = timeOfDayKey(routine);
      const list = groups.get(key) ?? [];
      list.push({ routine, ...progress });
      groups.set(key, list);
    }
    return { groups };
  };
  return { evaluate };
}

/** A time-of-day group is complete when any of its A/B routines is complete (refinement 3). */
export function groupComplete(group: readonly { complete: boolean }[]): boolean {
  return group.some((r) => r.complete);
}

function statusOf(ev: DayEval, day: string, today: string): SkinDayStatus {
  if (ev.groups.size === 0) return 'none';
  const groups = [...ev.groups.values()];
  if (groups.every(groupComplete)) return 'done';
  const anyTicked = groups.some((g) => g.some((r) => r.done > 0));
  if (anyTicked) return 'partly';
  return day < today ? 'missed' : 'pending';
}

function succeeded(ev: DayEval): boolean {
  for (const group of ev.groups.values()) if (group.some((r) => r.complete)) return true;
  return false;
}

export function skinDayStatus(day: string, input: SkinStreakInput): SkinDayStatus {
  return statusOf(createSkinIndex(input).evaluate(day), day, input.today);
}

/** Feature plan rule: a day succeeds when at least one routine due that day is complete. */
export function skinDaySucceeded(day: string, input: SkinStreakInput): boolean {
  return succeeded(createSkinIndex(input).evaluate(day));
}

/** Statuses for many days at once (calendar month), sharing one index. */
export function skinDayStatuses(
  days: readonly string[],
  input: SkinStreakInput,
): Map<string, SkinDayStatus> {
  const index = createSkinIndex(input);
  return new Map(days.map((d) => [d, statusOf(index.evaluate(d), d, input.today)]));
}

/**
 * Current and best skin streak. Days with nothing due are skipped; a succeeded day adds one; a
 * failed day ends a run. Today adds one once it succeeded and never breaks the streak.
 */
export function skinStreak(input: SkinStreakInput): Streak {
  if (input.routines.length === 0) return { current: 0, best: 0 };
  const index = createSkinIndex(input);
  let start = input.routines.reduce((min, r) => minDay(min, r.createdDay), input.today);
  for (const log of input.logs) start = minDay(start, log.day);

  let run = 0;
  let best = 0;
  for (let day = start; day <= input.today; day = addDays(day, 1)) {
    const ev = index.evaluate(day);
    if (ev.groups.size === 0) continue;
    if (succeeded(ev)) {
      run += 1;
      best = Math.max(best, run);
    } else if (day < input.today) {
      run = 0;
    }
  }
  return { current: run, best };
}

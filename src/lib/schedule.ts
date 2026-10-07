import { diffDays, weekdayOf } from './appDay';

/** Skin routine schedules (spec R2, R3, T1; refinements 2 and 3). */

export type TimeOfDayKind = 'morning' | 'evening' | 'custom';

export type RoutineLite = {
  id: number;
  name: string;
  timeOfDay: TimeOfDayKind;
  customName: string | null;
  sortTime: string;
  daysOfWeek: number[];
  active: boolean;
  /** App day the routine was created; earlier days never count. */
  createdDay: string;
};

export type StepLite = {
  id: number;
  routineId: number;
  productId: number | null;
  position: number;
  scheduleKind: 'always' | 'days' | 'interval';
  daysOfWeek: number[] | null;
  everyNDays: number | null;
  startDate: string | null;
};

export type RoutineLogLite = {
  routineId: number;
  day: string;
  dueStepIds: number[];
  doneStepIds: number[];
};

export type RoutineChoiceLite = { timeOfDayKey: string; weekday: number; routineId: number };

export type TodayGroup<R extends RoutineLite = RoutineLite> = {
  key: string;
  routines: R[];
  chosenId: number;
};

export function routineRunsOn(routine: RoutineLite, day: string): boolean {
  return routine.active && day >= routine.createdDay && routine.daysOfWeek.includes(weekdayOf(day));
}

/** Whether the step's own schedule allows `day`, ignoring the routine. */
export function stepScheduleAllows(step: StepLite, day: string): boolean {
  switch (step.scheduleKind) {
    case 'always':
      return true;
    case 'days':
      return (step.daysOfWeek ?? []).includes(weekdayOf(day));
    case 'interval': {
      const n = step.everyNDays ?? 1;
      const start = step.startDate;
      if (!start || n < 1) return false;
      const d = diffDays(day, start);
      return d >= 0 && d % n === 0;
    }
  }
}

/** Steps due on `day`, in order. Only these count toward done (refinement 2). */
export function dueSteps<S extends StepLite>(
  routine: RoutineLite,
  steps: readonly S[],
  day: string,
): S[] {
  if (!routineRunsOn(routine, day)) return [];
  return steps
    .filter((s) => s.routineId === routine.id && stepScheduleAllows(s, day))
    .sort((a, b) => a.position - b.position);
}

export function timeOfDayKey(routine: Pick<RoutineLite, 'timeOfDay' | 'customName'>): string {
  return routine.timeOfDay === 'custom' ? `custom:${routine.customName ?? ''}` : routine.timeOfDay;
}

const byTimeThenId = (a: RoutineLite, b: RoutineLite) =>
  a.sortTime === b.sortTime ? a.id - b.id : a.sortTime < b.sortTime ? -1 : 1;

/**
 * Today's routine cards (spec T1, refinement 3): one group per time of day with at least one
 * routine due, ordered by time. Two routines at one time of day are A/B options; the chosen one
 * comes from the weekday's remembered choice, else the first.
 */
export function todayGroups<R extends RoutineLite>(
  routines: readonly R[],
  steps: readonly StepLite[],
  day: string,
  choices: readonly RoutineChoiceLite[] = [],
): TodayGroup<R>[] {
  const stepsByRoutine = groupBy(steps, (s) => s.routineId);
  const groups = new Map<string, R[]>();
  for (const r of routines) {
    if (dueSteps(r, stepsByRoutine.get(r.id) ?? [], day).length === 0) continue;
    const key = timeOfDayKey(r);
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }
  const weekday = weekdayOf(day);
  return [...groups.entries()]
    .map(([key, list]) => {
      const sorted = [...list].sort(byTimeThenId);
      const remembered = choices.find(
        (c) =>
          c.timeOfDayKey === key &&
          c.weekday === weekday &&
          sorted.some((r) => r.id === c.routineId),
      );
      return { key, routines: sorted, chosenId: remembered?.routineId ?? sorted[0]!.id };
    })
    .sort((a, b) => byTimeThenId(a.routines[0]!, b.routines[0]!));
}

export type RoutineProgress = {
  due: number;
  done: number;
  complete: boolean;
  dueStepIds: number[];
};

/**
 * How far a routine is on `day`. A log's `dueStepIds` snapshot wins over recomputing, so editing
 * a routine never rewrites a finished day.
 */
export function routineProgress(
  routine: RoutineLite,
  steps: readonly StepLite[],
  log: Pick<RoutineLogLite, 'dueStepIds' | 'doneStepIds'> | null | undefined,
  day: string,
): RoutineProgress {
  const dueIds =
    log && log.dueStepIds.length > 0
      ? log.dueStepIds
      : dueSteps(routine, steps, day).map((s) => s.id);
  const doneSet = new Set(log?.doneStepIds ?? []);
  const done = dueIds.filter((id) => doneSet.has(id)).length;
  return {
    due: dueIds.length,
    done,
    complete: dueIds.length > 0 && done === dueIds.length,
    dueStepIds: dueIds,
  };
}

export function groupBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

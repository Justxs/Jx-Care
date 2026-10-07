import type { TimeOfDay } from '@/db/enums';
import { byTimeThenId } from '@/lib/schedule';

/** What grouping needs to know about a routine. */
export type ListRoutine = {
  id: number;
  timeOfDay: TimeOfDay;
  sortTime: string;
};

/**
 * One block of the R1 skin list.
 * - `single`: the only routine at that time of day; no heading (it would repeat the card's name).
 * - `alternatives`: two or more at one time of day, under "Evening, A or B" with its line.
 * - `custom`: every custom routine, under "Custom".
 */
export type RoutineListGroup<R extends ListRoutine = ListRoutine> = {
  key: 'morning' | 'evening' | 'custom';
  kind: 'single' | 'alternatives' | 'custom';
  routines: R[];
};

/** Morning, then Evening, then Custom; each in `sortTime` order. Empty groups are left out. */
export function groupRoutinesForList<R extends ListRoutine>(
  routines: readonly R[],
): RoutineListGroup<R>[] {
  const groups: RoutineListGroup<R>[] = [];
  for (const key of ['morning', 'evening', 'custom'] as const) {
    const list = routines.filter((r) => r.timeOfDay === key).sort(byTimeThenId);
    if (list.length === 0) continue;
    const kind = key === 'custom' ? 'custom' : list.length > 1 ? 'alternatives' : 'single';
    groups.push({ key, kind, routines: list });
  }
  return groups;
}

/**
 * Which side the starter sheet opens on: the time of day that has no routine yet, else by the
 * clock (evening from 14:00).
 */
export function defaultStarterTime(
  routines: readonly Pick<ListRoutine, 'timeOfDay'>[],
  hour: number,
): 'morning' | 'evening' {
  const hasMorning = routines.some((r) => r.timeOfDay === 'morning');
  const hasEvening = routines.some((r) => r.timeOfDay === 'evening');
  if (hasMorning && !hasEvening) return 'evening';
  if (hasEvening && !hasMorning) return 'morning';
  return hour >= 14 ? 'evening' : 'morning';
}

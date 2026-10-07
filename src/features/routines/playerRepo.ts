import type { Db } from '@/db';
import { routineChoice } from '@/db/schema';
import { addDays } from '@/lib/appDay';
import { todayGroups } from '@/lib/schedule';

import { pickNextUp, type NextGroup, type NextUp } from './playerLogic';
import { getTodayRoutines, listRoutines, type RoutineItem } from './repo';

/** How many days ahead "what comes next" looks; every weekly schedule repeats within 7. */
export const NEXT_UP_HORIZON_DAYS = 14;

const timeOf = (r: Pick<RoutineItem, 'reminderTime' | 'sortTime'>) => r.reminderTime ?? r.sortTime;

/**
 * What comes after `routineId` on the Routine done screen (T2): a later time of day still open
 * today, else the first time of day due on a coming day, with the remembered A/B pick's time.
 */
export function nextUp(db: Db, routineId: number, day: string, warnDays: number): NextUp | null {
  const today: NextGroup[] = getTodayRoutines(db, day, warnDays).map((g) => {
    const chosen = g.routines.find((r) => r.id === g.chosenId) ?? g.routines[0]!;
    return {
      key: g.key,
      timeOfDay: g.timeOfDay,
      customName: g.customName,
      routineIds: g.routines.map((r) => r.id),
      complete: g.complete,
      time: timeOf(chosen),
    };
  });
  const routines = listRoutines(db, day, warnDays);
  const steps = routines.flatMap((r) => r.steps);
  const choices = db.select().from(routineChoice).all();
  const days = [{ day, groups: today }];
  for (let i = 1; i <= NEXT_UP_HORIZON_DAYS; i++) {
    const d = addDays(day, i);
    const groups = todayGroups(routines, steps, d, choices).map((g) => {
      const chosen = g.routines.find((r) => r.id === g.chosenId) ?? g.routines[0]!;
      return {
        key: g.key,
        timeOfDay: chosen.timeOfDay,
        customName: chosen.customName,
        routineIds: g.routines.map((r) => r.id),
        complete: false,
        time: timeOf(chosen),
      };
    });
    days.push({ day: d, groups });
  }
  return pickNextUp(days, routineId);
}

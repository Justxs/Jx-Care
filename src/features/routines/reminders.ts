/**
 * Routine reminders (task 027; spec Notifications, refinement 8, S5, sequence 4).
 *
 * One notification per time of day on each day it has something due, at the reminder time, with
 * the number of steps due that day ("Evening routine: 5 steps"). Two routines at one time of day
 * (A/B) share one reminder, for the weekday's remembered pick. A time of day already done today
 * gets none. Snooze sends a copy later unless the routine is done by then; finishing a routine
 * cancels today's reminder and any snoozed copy.
 *
 * Registered with the notification layer through `src/notifications/tasks.ts`.
 */
import type { TFunction } from 'i18next';

import { getDb, type Db } from '@/db';
import { routine, routineChoice, type RoutineLog } from '@/db/schema';
import { addDays, appDay, momentOf } from '@/lib/appDay';
import { timeOfDayKey, todayGroups, type RoutineChoiceLite } from '@/lib/schedule';
import {
  askForReminders,
  cancelSnoozes,
  notificationKey,
  registerAction,
  registerPlanner,
  snoozeHandler,
  sync,
  syncEntity,
  type ActionHandler,
  type PlannedNotification,
  type Planner,
} from '@/notifications';

import {
  dayRoutine,
  getDayLog,
  groupDayRoutines,
  listRoutines,
  logsInRange,
  type DayRoutine,
  type RoutineItem,
  type TodayRoutineGroup,
} from './repo';

/** Days planned ahead: today plus 14, the scheduler keeps what falls inside its window. */
const PLAN_DAYS = 14;

// ─── Pure planning ──────────────────────────────────────────────────────────

export type RoutineReminderInput = {
  routines: readonly RoutineItem[];
  choices: readonly RoutineChoiceLite[];
  /** Logs from `today` on (only today's can exist in practice). */
  logs: readonly RoutineLog[];
  /** The current app day. */
  today: string;
  days?: number;
};

/** One reminder: a time of day on one app day, for the routine that will be shown. */
export type RoutineReminder = {
  day: string;
  /** 'HH:MM' */
  time: string;
  group: Pick<TodayRoutineGroup, 'key' | 'timeOfDay' | 'customName'>;
  /** The routine the player opens: the one already started, else the remembered pick, else the first. */
  routine: DayRoutine;
};

/**
 * Which reminders the routines want, from `today` through `today + days`. Per day and time of day
 * (the Today groups): the chosen routine's reminder time, or, if it has none, the first option's
 * that has one; nothing when no option has a reminder, nothing is due, or the group is complete.
 */
export function routineReminders(input: RoutineReminderInput): RoutineReminder[] {
  const steps = input.routines.flatMap((r) => r.steps);
  const logs = new Map(input.logs.map((l) => [`${l.routineId}@${l.day}`, l]));
  const out: RoutineReminder[] = [];
  for (let i = 0; i <= (input.days ?? PLAN_DAYS); i++) {
    const day = addDays(input.today, i);
    const groups = groupDayRoutines(
      todayGroups(input.routines, steps, day, input.choices).map((g) => ({
        key: g.key,
        chosenId: g.chosenId,
        routines: g.routines.map((r) => dayRoutine(r, logs.get(`${r.id}@${day}`) ?? null, day)),
      })),
    );
    for (const g of groups) {
      if (g.complete) continue;
      const chosen = g.routines.find((r) => r.id === g.chosenId) ?? g.routines[0]!;
      const time = chosen.reminderTime ?? g.routines.find((r) => r.reminderTime)?.reminderTime;
      if (!time || chosen.progress.due === 0) continue;
      out.push({ day, time, group: g, routine: chosen });
    }
  }
  return out;
}

/** "Evening routine: 5 steps", "After gym: 1 step". */
export function reminderTitle(reminder: RoutineReminder, t: TFunction): string {
  const count = reminder.routine.progress.due;
  const { timeOfDay, customName } = reminder.group;
  if (timeOfDay === 'custom') {
    return t('routines.reminders.custom', { name: customName ?? t('common.custom'), count });
  }
  return t(`routines.reminders.${timeOfDay}`, { count });
}

export function toPlanned(reminder: RoutineReminder, t: TFunction): PlannedNotification {
  const { routine: r, day } = reminder;
  return {
    key: notificationKey('routine', r.id, 'routine', day),
    entityType: 'routine',
    entityId: r.id,
    kind: 'routine',
    fireAt: momentOf(day, reminder.time),
    title: reminderTitle(reminder, t),
    body: r.name,
    categoryId: 'routine',
    channelId: 'routines',
    data: { url: `/player/${r.id}` },
  };
}

// ─── Planner ────────────────────────────────────────────────────────────────

function loadInput(db: Db, today: string, warnDays: number): RoutineReminderInput {
  return {
    routines: listRoutines(db, today, warnDays),
    choices: db.select().from(routineChoice).all(),
    logs: logsInRange(db, today, addDays(today, PLAN_DAYS)),
    today,
  };
}

/** Everything routine reminders want scheduled; nothing while the S5 master switch is off. */
export const routineReminderPlanner: Planner = ({ db, now, settings, t }) => {
  if (!settings.routineRemindersOn) return [];
  const input = loadInput(db, appDay(now), settings.expiryWarnDays);
  return routineReminders(input)
    .map((r) => toPlanned(r, t))
    .filter((p) => p.fireAt > now);
};

/** The routine and every other routine at its time of day: one reminder covers them all. */
export function groupRoutineIds(db: Db, routineId: number): number[] {
  const all = db
    .select({ id: routine.id, timeOfDay: routine.timeOfDay, customName: routine.customName })
    .from(routine)
    .all();
  const self = all.find((r) => r.id === routineId);
  if (!self) return [routineId];
  const key = timeOfDayKey(self);
  return all.filter((r) => timeOfDayKey(r) === key).map((r) => r.id);
}

/** Whether the routine's time of day is already done on `day` (either A/B option counts). */
export function groupDoneOn(db: Db, routineId: number, day: string): boolean {
  return groupRoutineIds(db, routineId).some((id) => getDayLog(db, id, day)?.completedAt != null);
}

// ─── Side effects ───────────────────────────────────────────────────────────

let settled: Promise<void> = Promise.resolve();

/**
 * Runs reminder work one after another, never throwing: a failed sync is retried by the next
 * app open or daily refresh, and without an OS adapter (tests of other screens) there is nothing
 * to do.
 */
function run(task: () => Promise<unknown>): Promise<void> {
  const next = settled.then(task).then(
    () => {},
    () => {},
  );
  settled = next;
  return next;
}

/** Resolves when reminder work started so far has finished (tests). */
export function remindersSettled(): Promise<void> {
  return settled;
}

/**
 * After a routine is created, edited, switched on or off, duplicated or deleted, or an A/B pick
 * changes. A full `sync` rather than `syncEntity`: a change to one routine can move its time of
 * day's reminder to another routine (A/B, a new time of day), and `syncEntity` plans everything
 * anyway, so this costs the same.
 */
export function resyncRoutineReminders(now?: number): Promise<void> {
  return run(() => sync(now ?? Date.now()));
}

/**
 * A routine became complete: today's reminder for its time of day goes (the planner skips a done
 * group, so syncing each routine of the group cancels it), and so does any snoozed copy.
 */
export function cancelTodaysRoutineReminders(routineId: number, now?: number): Promise<void> {
  return run(async () => {
    const ids = groupRoutineIds(getDb(), routineId);
    for (const id of ids) {
      await syncEntity('routine', id, now ?? Date.now());
      await cancelSnoozes('routine', id);
    }
  });
}

/**
 * The editor's Reminder switch was turned on: the shared in-context ask (refinement 8, task 021)
 * and, once permission is granted, a sync so everything that waited for it is scheduled.
 */
export function askForRoutineReminders(): Promise<void> {
  return askForReminders({ reason: 'routine' }).then(
    (outcome) => (outcome === 'granted' ? run(() => sync()) : undefined),
    () => {},
  );
}

/** Snooze: a copy after the snooze length, unless the time of day is already done today. */
export const routineSnoozeHandler: ActionHandler = async (ctx) => {
  const id = ctx.data.entityId;
  if (id !== null && groupDoneOn(ctx.db, id, appDay(ctx.now))) return;
  await snoozeHandler(ctx);
};

registerPlanner('routines', routineReminderPlanner);
registerAction('routine', 'snooze', routineSnoozeHandler);

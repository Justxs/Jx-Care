import { addDays, diffDays, weekdayOf } from './appDay';

/** Hair tasks: next due, overdue state, hair streak and calendar marks (spec R5, T3, C1; refinement 6). */

export type HairOtherKindLite = 'trim' | 'colour' | 'mask' | 'other';

export type HairTaskLite = {
  id: number;
  kind: 'wash' | 'other';
  otherKind: HairOtherKindLite | null;
  scheduleKind: 'interval' | 'days';
  everyNDays: number | null;
  daysOfWeek: number[] | null;
  lastDoneAt: string | null;
  active: boolean;
  createdDay: string;
};

export type HairLogLite = { hairTaskId: number; day: string; dueDay: string | null };

export type HairState = 'upcoming' | 'due' | 'overdue';

/** The first scheduled day strictly after `after`. */
export function nextScheduledAfter(task: HairTaskLite, after: string): string {
  if (task.scheduleKind === 'days') {
    const days = task.daysOfWeek ?? [];
    if (days.length === 0) return addDays(after, 7);
    for (let i = 1; i <= 7; i++) {
      const d = addDays(after, i);
      if (days.includes(weekdayOf(d))) return d;
    }
  }
  return addDays(after, Math.max(1, task.everyNDays ?? 1));
}

/**
 * The latest scheduled day strictly before `before`: the earliest "last done" day that still
 * gives `before` as the next due day. Used to put a schedule back when its latest log is deleted.
 */
export function previousScheduledBefore(task: HairTaskLite, before: string): string {
  if (task.scheduleKind === 'days') {
    const days = task.daysOfWeek ?? [];
    for (let i = 1; i <= 7 && days.length > 0; i++) {
      const d = addDays(before, -i);
      if (days.includes(weekdayOf(d))) return d;
    }
    return addDays(before, -7);
  }
  return addDays(before, -Math.max(1, task.everyNDays ?? 1));
}

/** Next due day: after the last time it was done; a task never done is due on its creation day. */
export function nextDue(task: HairTaskLite): string {
  if (!task.lastDoneAt) return task.createdDay;
  return nextScheduledAfter(task, task.lastDoneAt);
}

export function hairTaskState(
  task: HairTaskLite,
  today: string,
): { dueDay: string; state: HairState; overdueDays: number } {
  const dueDay = nextDue(task);
  const diff = diffDays(today, dueDay);
  if (diff < 0) return { dueDay, state: 'upcoming', overdueDays: 0 };
  if (diff === 0) return { dueDay, state: 'due', overdueDays: 0 };
  return { dueDay, state: 'overdue', overdueDays: diff };
}

/** Early or on the due day is on time (refinement 6); after it is late. */
export function logTiming(doneDay: string, dueDay: string | null): 'on_time' | 'late' {
  return !dueDay || doneDay <= dueDay ? 'on_time' : 'late';
}

/**
 * Hair streak, washes only. A run is consecutive on-time wash logs; a late log ends it. The
 * current run is 0 while any active wash task is overdue (due today does not break it).
 */
export function hairStreak(
  tasks: readonly HairTaskLite[],
  logs: readonly HairLogLite[],
  today: string,
): { current: number; best: number } {
  const washIds = new Set(tasks.filter((t) => t.kind === 'wash').map((t) => t.id));
  const washLogs = logs
    .filter((l) => washIds.has(l.hairTaskId))
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  let run = 0;
  let best = 0;
  for (const log of washLogs) {
    if (logTiming(log.day, log.dueDay) === 'on_time') {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  const overdue = tasks.some(
    (t) => t.kind === 'wash' && t.active && hairTaskState(t, today).state === 'overdue',
  );
  return { current: overdue ? 0 : run, best };
}

export type HairDayMark = {
  washDone: boolean;
  washLate: boolean;
  washDue: boolean;
  overdue: boolean;
  otherCare: HairOtherKindLite[];
};

/** Per-day marks for the C1 Hair view. Future due days are projected from the schedule. */
export function hairMonthMarks(
  tasks: readonly HairTaskLite[],
  logs: readonly HairLogLite[],
  days: readonly string[],
  today: string,
): Map<string, HairDayMark> {
  const marks = new Map<string, HairDayMark>();
  for (const d of days) {
    marks.set(d, {
      washDone: false,
      washLate: false,
      washDue: false,
      overdue: false,
      otherCare: [],
    });
  }
  if (days.length === 0) return marks;
  const last = days.reduce((a, b) => (a > b ? a : b));
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  for (const log of logs) {
    const mark = marks.get(log.day);
    const task = taskById.get(log.hairTaskId);
    if (!mark || !task) continue;
    if (task.kind === 'wash') {
      if (logTiming(log.day, log.dueDay) === 'on_time') mark.washDone = true;
      else mark.washLate = true;
    } else {
      const kind = task.otherKind ?? 'other';
      if (!mark.otherCare.includes(kind)) mark.otherCare.push(kind);
    }
  }

  for (const task of tasks) {
    if (task.kind !== 'wash' || !task.active) continue;
    const { dueDay, state } = hairTaskState(task, today);
    if (state === 'overdue') {
      const m = marks.get(dueDay);
      if (m) m.overdue = true;
    }
    // Project future due days, assuming each is done on time.
    let due = state === 'overdue' ? nextScheduledAfter(task, today) : dueDay;
    if (state === 'overdue') {
      const m = marks.get(today);
      if (m) m.washDue = true;
    }
    let guard = 0;
    while (due <= last && guard++ < 400) {
      const m = marks.get(due);
      if (m && due >= today) m.washDue = true;
      due = nextScheduledAfter(task, due);
    }
  }
  return marks;
}

export type QuickWashFrequency =
  | 'every_day'
  | 'every_2_days'
  | 'every_3_days'
  | 'twice_a_week'
  | 'once_a_week';

export type HairScheduleChoice = {
  scheduleKind: 'interval' | 'days';
  everyNDays: number | null;
  daysOfWeek: number[] | null;
  intervalUnit: 'days' | 'weeks';
};

/** Quick hair setup chips (spec R5) → a schedule. Twice a week is Monday and Thursday. */
export function quickSetupToTask(frequency: QuickWashFrequency): HairScheduleChoice {
  switch (frequency) {
    case 'every_day':
      return { scheduleKind: 'interval', everyNDays: 1, daysOfWeek: null, intervalUnit: 'days' };
    case 'every_2_days':
      return { scheduleKind: 'interval', everyNDays: 2, daysOfWeek: null, intervalUnit: 'days' };
    case 'every_3_days':
      return { scheduleKind: 'interval', everyNDays: 3, daysOfWeek: null, intervalUnit: 'days' };
    case 'twice_a_week':
      return { scheduleKind: 'days', everyNDays: null, daysOfWeek: [1, 4], intervalUnit: 'days' };
    case 'once_a_week':
      return { scheduleKind: 'interval', everyNDays: 7, daysOfWeek: null, intervalUnit: 'days' };
  }
}

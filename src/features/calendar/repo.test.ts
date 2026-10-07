import { eq } from 'drizzle-orm';

import type { Db } from '@/db';
import { routine } from '@/db/schema';
import { createTestDb } from '@/db/test-db';
import {
  getRoutine,
  saveRoutine,
  streakInput,
  tickStep,
  tickSteps,
  type SaveRoutineInput,
} from '@/features/routines/repo';
import type { StepInput } from '@/features/routines/schema';
import { weekdayOf } from '@/lib/appDay';
import { skinStreak } from '@/lib/streak';

import { gridDays, monthOf, shiftMonth } from './month';
import { canEditDay, getSkinDay, getSkinMonth, oldestEditableDay } from './repo';

const TODAY = '2026-10-07'; // a Wednesday
const WARN = 30;
const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7];

const step = (over: Partial<StepInput> = {}): StepInput => ({
  id: null,
  productId: null,
  note: null,
  scheduleKind: 'always',
  daysOfWeek: null,
  everyNDays: null,
  startDate: null,
  waitSeconds: 0,
  ...over,
});

/** A routine created on 2 October 2026, so 1 October has nothing due. */
function addRoutine(db: Db, over: Partial<SaveRoutineInput> = {}): number {
  const id = saveRoutine(db, {
    name: 'Evening',
    timeOfDay: 'evening',
    customName: null,
    sortTime: '21:00',
    daysOfWeek: EVERY_DAY,
    reminderTime: null,
    steps: [step({ note: 'Cleanser' }), step({ note: 'Serum' })],
    ...over,
  });
  db.update(routine)
    .set({ createdAt: new Date(2026, 9, 2, 12).getTime() })
    .where(eq(routine.id, id))
    .run();
  return id;
}

const stepIds = (db: Db, id: number) => getRoutine(db, id, TODAY, WARN)!.steps.map((s) => s.id);

/** Morning (1 step) and Evening (2 steps) every day; one of each kind of day around today. */
function seededMonth() {
  const db = createTestDb();
  const morning = addRoutine(db, {
    name: 'Morning',
    timeOfDay: 'morning',
    sortTime: '07:00',
    steps: [step({ note: 'SPF' })],
  });
  const evening = addRoutine(db);
  const [m1] = stepIds(db, morning);
  const ev = stepIds(db, evening);
  // 5 Oct: both done. 6 Oct: one evening step. 4 Oct: nothing. 7 Oct (today): nothing yet.
  tickStep(db, morning, m1!, '2026-10-05', true, [m1!]);
  tickSteps(db, evening, ev, '2026-10-05', true, ev);
  tickStep(db, evening, ev[0]!, '2026-10-06', true, ev);
  return { db, morning, evening, m1: m1!, ev };
}

describe('month grid days', () => {
  it('always has 6 rows, Monday first; October 2026 starts on a Thursday', () => {
    const days = gridDays('2026-10');
    expect(days).toHaveLength(42);
    expect(weekdayOf(days[0]!)).toBe(1);
    expect(days.indexOf('2026-10-01')).toBe(3);
    expect(weekdayOf('2026-10-01')).toBe(4);
    expect(days[41]).toBe('2026-11-08');
  });

  it('starts on the 1st for a month that begins on Monday, and on the row end for Sunday', () => {
    const june = gridDays('2026-06');
    expect(june[0]).toBe('2026-06-01');
    expect(june).toHaveLength(42);
    const feb = gridDays('2026-02');
    expect(feb.indexOf('2026-02-01')).toBe(6);
    expect(feb[0]).toBe('2026-01-26');
    expect(feb).toHaveLength(42);
  });

  it('moves between months across years', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(monthOf('2026-10-07')).toBe('2026-10');
  });
});

describe('getSkinMonth', () => {
  it('gives every grid day its status from one load', () => {
    const { db } = seededMonth();
    const month = getSkinMonth(db, gridDays('2026-10'), TODAY);
    expect(month.hasRoutines).toBe(true);
    expect(Object.keys(month.statuses)).toHaveLength(42);
    expect(month.statuses).toMatchObject({
      '2026-10-01': 'none', // before the routines existed
      '2026-10-04': 'missed', // shown as "Not done"
      '2026-10-05': 'done',
      '2026-10-06': 'partly',
      '2026-10-07': 'pending',
      '2026-10-08': 'pending', // still to come: no mark
      '2026-09-28': 'none',
    });
  });

  it('has no routines and no marks on a fresh install', () => {
    const month = getSkinMonth(createTestDb(), gridDays('2026-10'), TODAY);
    expect(month.hasRoutines).toBe(false);
    expect(new Set(Object.values(month.statuses))).toEqual(new Set(['none']));
  });

  it('keeps a finished day done after a step is deleted or added', () => {
    const { db, evening, ev } = seededMonth();
    saveRoutine(db, {
      id: evening,
      name: 'Evening',
      timeOfDay: 'evening',
      customName: null,
      sortTime: '21:00',
      daysOfWeek: EVERY_DAY,
      reminderTime: null,
      steps: [step({ id: ev[1]!, note: 'Serum' }), step({ note: 'Cream' })],
    });
    const month = getSkinMonth(db, gridDays('2026-10'), TODAY);
    expect(month.statuses['2026-10-05']).toBe('done');
    // The deleted step was the one ticked on 6 Oct, so nothing of that day is left ticked.
    expect(month.statuses['2026-10-06']).toBe('missed');
  });
});

describe('getSkinDay', () => {
  it('lists the routines due with their due steps and ticks', () => {
    const { db, morning, evening, ev } = seededMonth();
    const day = getSkinDay(db, '2026-10-06', TODAY, WARN);
    expect(day.status).toBe('partly');
    expect(day.groups.map((g) => g.key)).toEqual(['morning', 'evening']);
    const [m, e] = day.groups.map((g) => g.routines[0]!);
    expect(m).toMatchObject({ id: morning, progress: { due: 1, done: 0, complete: false } });
    expect(e).toMatchObject({ id: evening, progress: { due: 2, done: 1, complete: false } });
    expect(e!.dueSteps.map((s) => s.note)).toEqual(['Cleanser', 'Serum']);
    expect(e!.log?.doneStepIds).toEqual([ev[0]]);
  });

  it('says a past day with nothing ticked was not done, and nothing is due before creation', () => {
    const { db } = seededMonth();
    expect(getSkinDay(db, '2026-10-04', TODAY, WARN).status).toBe('missed');
    const before = getSkinDay(db, '2026-10-01', TODAY, WARN);
    expect(before).toMatchObject({ status: 'none', groups: [] });
  });

  it('shows only the A/B option that was started', () => {
    const db = createTestDb();
    const a = addRoutine(db, { name: 'Evening A' });
    const b = addRoutine(db, { name: 'Evening B' });
    expect(getSkinDay(db, '2026-10-05', TODAY, WARN).groups[0]!.routines.map((r) => r.id)).toEqual([
      a,
      b,
    ]);
    const [s] = stepIds(db, b);
    tickStep(db, b, s!, '2026-10-05', true, stepIds(db, b));
    const day = getSkinDay(db, '2026-10-05', TODAY, WARN);
    expect(day.groups[0]!.routines.map((r) => r.id)).toEqual([b]);
    expect(day.status).toBe('partly');
  });

  it('counts a tick on a past day toward the streak', () => {
    const { db, morning, m1 } = seededMonth();
    // 5 Oct done; 6 Oct is partly (not complete), so the streak is broken after 5 Oct.
    expect(skinStreak(streakInput(db, TODAY))).toEqual({ current: 0, best: 1 });
    tickStep(db, morning, m1, '2026-10-06', true, [m1]);
    expect(getSkinDay(db, '2026-10-06', TODAY, WARN).status).toBe('partly');
    expect(skinStreak(streakInput(db, TODAY))).toEqual({ current: 2, best: 2 });
  });
});

describe('edit window', () => {
  it('allows today and the six days before it', () => {
    expect(canEditDay(TODAY, TODAY)).toBe(true);
    expect(canEditDay('2026-10-01', TODAY)).toBe(true);
    expect(oldestEditableDay(TODAY)).toBe('2026-10-01');
    expect(canEditDay('2026-09-30', TODAY)).toBe(false);
    expect(canEditDay('2026-10-08', TODAY)).toBe(false);
  });
});

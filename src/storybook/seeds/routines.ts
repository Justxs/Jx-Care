/**
 * Extra story data for Today and the routine screens, written only through the repo functions.
 * Product names stay in English in both languages (they are data).
 */
import type { Db } from '@/db';
import { saveHairTask } from '@/features/hair/repo';
import { createProduct } from '@/features/products/repo';
import type { ProductInput } from '@/features/products/schema';
import {
  deleteRoutine,
  getRoutine,
  getRoutineDay,
  saveRoutine,
  tickSteps,
} from '@/features/routines/repo';
import type { StepInput } from '@/features/routines/schema';
import { addDays, momentOf } from '@/lib/appDay';

import { FIXTURE_TODAY, demoIds, seedDemo, seedEmpty } from '../fixtures';

/** The routines `seedPlayerProblems` adds after the demo ones. */
export const routineSeedIds = {
  /** Custom "Weekly reset", every day: finished clay mask, a step with no product, expired SPF. */
  problems: 4,
  /** Weekends only, so not due on `FIXTURE_TODAY` (a Wednesday). */
  weekend: 5,
} as const;

const everyDay = [1, 2, 3, 4, 5, 6, 7];

const product = (over: Partial<ProductInput> & Pick<ProductInput, 'name'>): ProductInput => ({
  brand: null,
  area: 'skin',
  category: 'other',
  size: null,
  unit: null,
  price: null,
  purchasedAt: null,
  expiresAt: null,
  openedAt: null,
  paoMonths: null,
  notes: null,
  photoUri: null,
  ingredients: [],
  ...over,
});

const step = (productId: number | null, over: Partial<StepInput> = {}): StepInput => ({
  id: null,
  productId,
  note: null,
  scheduleKind: 'always',
  daysOfWeek: null,
  everyNDays: null,
  startDate: null,
  waitSeconds: 0,
  ...over,
});

function check(what: string, actual: number, expected: number): void {
  if (actual !== expected) {
    throw new Error(`seeds/routines: ${what} got id ${actual}, expected ${expected}`);
  }
}

function firstProduct(db: Db, today: string): number {
  return createProduct(
    db,
    product({
      name: 'Vitamin C 15% Serum',
      brand: 'Lumi Lab',
      category: 'serum',
      openedAt: addDays(today, -3),
      paoMonths: 6,
      ingredients: ['Aqua', 'Ascorbic acid'],
    }),
  );
}

/** First run, one step in: a product exists, no routine and no hair task yet ("1 of 3"). */
export function seedSetupStarted(db: Db, today: string = FIXTURE_TODAY): void {
  seedEmpty(db);
  firstProduct(db, today);
}

/**
 * First run with all three steps done today (a product, a routine, a wash task) and the card not
 * yet dismissed: Today shows "You're set".
 */
export function seedSetupComplete(db: Db, today: string = FIXTURE_TODAY): void {
  seedEmpty(db);
  const serum = firstProduct(db, today);
  saveRoutine(db, {
    name: 'Morning',
    timeOfDay: 'morning',
    customName: null,
    sortTime: '07:00',
    daysOfWeek: everyDay,
    reminderTime: null,
    steps: [step(serum)],
  });
  saveHairTask(db, {
    name: 'Wash',
    kind: 'wash',
    otherKind: null,
    productIds: [],
    scheduleKind: 'interval',
    everyNDays: 3,
    intervalUnit: 'days',
    daysOfWeek: null,
    lastDoneAt: today,
    reminderTime: null,
  });
}

/** Finishes every step of a routine due on `day` that isn't ticked yet. */
function finishRoutine(db: Db, routineId: number, day: string, at: string): void {
  const r = getRoutineDay(db, routineId, day, 30);
  if (!r) throw new Error(`seeds/routines: routine ${routineId} is missing`);
  const due = r.progress.dueStepIds;
  tickSteps(db, routineId, due, day, true, due, momentOf(day, at));
}

/** The demo data with today's morning finished (the evening still to do): a 6-day streak. */
export function seedMorningDone(db: Db, today: string = FIXTURE_TODAY): void {
  seedDemo(db, today);
  finishRoutine(db, demoIds.routines.morning, today, '07:25');
}

/** The demo data with today's morning and the picked evening (A) both finished: a 6-day streak. */
export function seedAllDone(db: Db, today: string = FIXTURE_TODAY): void {
  seedDemo(db, today);
  finishRoutine(db, demoIds.routines.morning, today, '07:25');
  finishRoutine(db, demoIds.routines.eveningA, today, '21:45');
}

/**
 * The demo data plus a routine whose steps all need attention in the player (a finished product,
 * a step without a product, an expired product) and one that isn't due today.
 */
export function seedPlayerProblems(db: Db, today: string = FIXTURE_TODAY): void {
  seedDemo(db, today);
  const p = demoIds.products;
  check(
    'problems',
    saveRoutine(db, {
      name: 'Weekly reset',
      timeOfDay: 'custom',
      customName: 'Afternoon',
      sortTime: '15:00',
      daysOfWeek: everyDay,
      reminderTime: null,
      steps: [
        step(p.cleanser),
        step(p.clayMask, { note: 'Ten minutes, then rinse', waitSeconds: 600 }),
        step(null, { note: 'Hydrating mist' }),
        step(p.sunscreen),
      ],
    }),
    routineSeedIds.problems,
  );
  check(
    'weekend',
    saveRoutine(db, {
      name: 'Weekend facial',
      timeOfDay: 'evening',
      customName: null,
      sortTime: '20:00',
      daysOfWeek: [6, 7],
      reminderTime: null,
      steps: [step(p.cleanser), step(p.glycolicToner), step(p.moisturiser)],
    }),
    routineSeedIds.weekend,
  );
}

/**
 * The demo data after some deleting: Evening B was deleted two days ago (R1 "Deleted routines")
 * and the morning's sunscreen step yesterday (the editor's "Deleted steps"). Their history stays.
 */
export function seedDeleted(db: Db, today: string = FIXTURE_TODAY): void {
  seedDemo(db, today);
  const r = demoIds.routines;
  deleteRoutine(db, r.eveningB, momentOf(addDays(today, -2), '21:00'));
  const morning = getRoutine(db, r.morning, today, 30);
  if (!morning) throw new Error('seeds/routines: the morning routine is missing');
  saveRoutine(
    db,
    {
      ...morning,
      steps: morning.steps
        .filter((st) => st.productId !== demoIds.products.sunscreen)
        .map(({ product: _p, routineId: _r, position: _o, deletedAt: _d, ...st }) => st),
    },
    momentOf(addDays(today, -1), '09:00'),
  );
}

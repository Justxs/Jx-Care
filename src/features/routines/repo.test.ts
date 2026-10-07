import { eq } from 'drizzle-orm';

import type { Db } from '@/db';
import { createTestDb } from '@/db/test-db';
import { hairTask, routine, routineChoice, routineLog, routineStep } from '@/db/schema';
import { createProduct, getProduct, markFinished } from '@/features/products/repo';
import type { ProductInput } from '@/features/products/schema';
import { skinStreak } from '@/lib/streak';

import {
  deleteRoutine,
  duplicateRoutine,
  getDayLog,
  getRoutine,
  getRoutineDay,
  getTodayRoutines,
  listRoutines,
  logsInRange,
  recentStepProducts,
  replaceStepProduct,
  saveRoutine,
  setChoice,
  setRoutineActive,
  streakInput,
  tickSteps,
  type SaveRoutineInput,
} from './repo';
import type { StepInput } from './schema';

// 2026-10-05 is a Monday (the same days as task 007's fixtures).
const MON = '2026-10-05';
const TUE = '2026-10-06';
const WED = '2026-10-07';
const WARN = 30;
const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7];

const productInput = (over: Partial<ProductInput> = {}): ProductInput => ({
  name: 'Cream',
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

const routineInput = (over: Partial<SaveRoutineInput> = {}): SaveRoutineInput => ({
  name: 'Evening',
  timeOfDay: 'evening',
  customName: null,
  sortTime: '21:00',
  daysOfWeek: EVERY_DAY,
  reminderTime: null,
  steps: [step()],
  ...over,
});

/** Saves a routine created long before the test days, so every day counts. */
function addRoutine(db: Db, over: Partial<SaveRoutineInput> = {}): number {
  const id = saveRoutine(db, routineInput(over));
  db.update(routine)
    .set({ createdAt: new Date(2026, 0, 1, 12).getTime() })
    .where(eq(routine.id, id))
    .run();
  return id;
}

const stepIds = (db: Db, id: number) => getRoutine(db, id, MON, WARN)!.steps.map((s) => s.id);

describe('saveRoutine', () => {
  it('saves reordered, added and removed steps in one go', () => {
    const db = createTestDb();
    const a = createProduct(db, productInput({ name: 'A' }));
    const b = createProduct(db, productInput({ name: 'B' }));
    const c = createProduct(db, productInput({ name: 'C' }));
    const d = createProduct(db, productInput({ name: 'D' }));
    const id = addRoutine(db, {
      steps: [step({ productId: a }), step({ productId: b }), step({ productId: c })],
    });
    const [sa, sb, sc] = stepIds(db, id);

    saveRoutine(
      db,
      routineInput({
        id,
        name: 'Evening A',
        steps: [
          step({ id: sc, productId: c, note: '2 drops' }),
          step({ productId: d }),
          step({ id: sa, productId: a }),
        ],
      }),
    );

    const saved = getRoutine(db, id, MON, WARN)!;
    expect(saved.name).toBe('Evening A');
    expect(saved.steps.map((s) => s.product?.name)).toEqual(['C', 'D', 'A']);
    expect(saved.steps.map((s) => s.position)).toEqual([0, 1, 2]);
    expect(saved.steps[0]).toMatchObject({ id: sc, note: '2 drops' });
    expect(saved.steps[2]!.id).toBe(sa);
    expect(saved.steps.map((s) => s.id)).not.toContain(sb);
    expect(saved.stepCount).toBe(3);
  });

  it('inserts a step whose id belongs to another routine instead of moving it', () => {
    const db = createTestDb();
    const one = addRoutine(db);
    const two = addRoutine(db, { name: 'Two' });
    const [foreign] = stepIds(db, one);
    saveRoutine(db, routineInput({ id: two, name: 'Two', steps: [step({ id: foreign })] }));
    expect(stepIds(db, one)).toEqual([foreign]);
    expect(stepIds(db, two)).toHaveLength(1);
    expect(stepIds(db, two)[0]).not.toBe(foreign);
  });

  it('keeps active unless told otherwise, and the switch persists', () => {
    const db = createTestDb();
    const id = addRoutine(db);
    setRoutineActive(db, id, false);
    saveRoutine(db, routineInput({ id }));
    expect(getRoutine(db, id, MON, WARN)!.active).toBe(false);
    setRoutineActive(db, id, true);
    expect(listRoutines(db, MON, WARN)[0]!.active).toBe(true);
  });
});

describe('listRoutines and step products', () => {
  it('orders by time and carries step product info', () => {
    const db = createTestDb();
    const p = createProduct(db, productInput({ name: 'SPF', brand: 'Sun', category: 'spf' }));
    addRoutine(db, { name: 'Night' });
    addRoutine(db, {
      name: 'Day',
      timeOfDay: 'morning',
      sortTime: '07:00',
      reminderTime: '07:30',
      steps: [step({ productId: p }), step()],
    });
    const list = listRoutines(db, MON, WARN);
    expect(list.map((r) => r.name)).toEqual(['Day', 'Night']);
    expect(list[0]).toMatchObject({ stepCount: 2, reminderTime: '07:30', active: true });
    expect(list[0]!.steps[0]!.product).toMatchObject({
      name: 'SPF',
      brand: 'Sun',
      area: 'skin',
      archivedAt: null,
      problem: null,
    });
    expect(list[0]!.steps[1]!.product).toBeNull();
  });

  it('a step with a finished product still appears, flagged with its status', () => {
    const db = createTestDb();
    const fine = createProduct(db, productInput({ name: 'Fine' }));
    const gone = createProduct(db, productInput({ name: 'Gone' }));
    const old = createProduct(db, productInput({ name: 'Old', expiresAt: '2026-10-02' }));
    const id = addRoutine(db, {
      steps: [step({ productId: fine }), step({ productId: gone }), step({ productId: old })],
    });
    markFinished(db, gone, MON);

    const [group] = getTodayRoutines(db, MON, WARN);
    const steps = group!.routines[0]!.dueSteps;
    expect(steps.map((s) => s.product?.name)).toEqual(['Fine', 'Gone', 'Old']);
    expect(steps.map((s) => s.product?.problem)).toEqual([null, 'finished', 'expired']);
    expect(steps[1]!.product).toMatchObject({ archivedAt: MON });
    expect(steps[2]!.product).toMatchObject({ status: 'expired', effectiveExpiry: '2026-10-02' });
    expect(getRoutineDay(db, id, MON, WARN)!.dueSteps).toHaveLength(3);
  });

  it('replaceStepProduct swaps the product of one step', () => {
    const db = createTestDb();
    const gone = createProduct(db, productInput({ name: 'Gone' }));
    const fresh = createProduct(db, productInput({ name: 'Fresh' }));
    const id = addRoutine(db, { steps: [step({ productId: gone })] });
    const [s] = stepIds(db, id);
    replaceStepProduct(db, s!, fresh);
    expect(getRoutine(db, id, MON, WARN)!.steps[0]!.product?.name).toBe('Fresh');
  });
});

describe('ticks', () => {
  it('ticking the last due step sets completedAt and unticking clears it', () => {
    const db = createTestDb();
    const id = addRoutine(db, { steps: [step(), step()] });
    const [s1, s2] = stepIds(db, id);
    const due = [s1!, s2!];

    expect(tickSteps(db, id, [s1!], MON, true, due, 1000)).toMatchObject({
      dueStepIds: due,
      doneStepIds: [s1],
      completedAt: null,
    });
    expect(tickSteps(db, id, [s2!], MON, true, due, 2000)!.completedAt).toBe(2000);
    // A repeat tick keeps the first finish time.
    expect(tickSteps(db, id, [s2!], MON, true, due, 3000)!.completedAt).toBe(2000);
    const unticked = tickSteps(db, id, [s1!], MON, false, due, 4000)!;
    expect(unticked).toMatchObject({ doneStepIds: [s2], completedAt: null });
    expect(getDayLog(db, id, MON)!.completedAt).toBeNull();
    expect(getDayLog(db, id, TUE)).toBeNull();
  });

  it('unticking a day with no log does nothing', () => {
    const db = createTestDb();
    const id = addRoutine(db);
    const [s] = stepIds(db, id);
    expect(tickSteps(db, id, [s!], MON, false, [s!])).toBeNull();
    expect(getDayLog(db, id, MON)).toBeNull();
  });

  it('All done ticks several steps at once and its Undo unticks them', () => {
    const db = createTestDb();
    const id = addRoutine(db, { steps: [step(), step(), step()] });
    const ids = stepIds(db, id);
    tickSteps(db, id, [ids[0]!], MON, true, ids, 1);
    const rest = ids.slice(1);
    expect(tickSteps(db, id, rest, MON, true, ids, 2)!.completedAt).toBe(2);
    expect(tickSteps(db, id, rest, MON, false, ids, 3)).toMatchObject({
      doneStepIds: [ids[0]],
      completedAt: null,
    });
  });

  it('keeps the dueStepIds snapshot after the routine is edited', () => {
    const db = createTestDb();
    const id = addRoutine(db, { steps: [step(), step()] });
    const [s1, s2] = stepIds(db, id);
    tickSteps(db, id, [s1!], MON, true, [s1!, s2!]);
    tickSteps(db, id, [s2!], MON, true, [s1!, s2!], 5000);

    // Monday's routine had two steps; it now has three.
    saveRoutine(db, routineInput({ id, steps: [step({ id: s1 }), step({ id: s2 }), step()] }));
    expect(getDayLog(db, id, MON)).toMatchObject({ dueStepIds: [s1, s2], completedAt: 5000 });
    const mon = getRoutineDay(db, id, MON, WARN)!;
    expect(mon.progress).toMatchObject({ due: 2, done: 2, complete: true });
    expect(getRoutineDay(db, id, TUE, WARN)!.progress.due).toBe(3);
    // The finished Monday still counts for the streak.
    expect(skinDay(db, MON)).toBe(true);
  });

  it('a step deleted after the first tick no longer blocks the day', () => {
    const db = createTestDb();
    const id = addRoutine(db, { steps: [step(), step()] });
    const [s1, s2] = stepIds(db, id);
    tickSteps(db, id, [s1!], MON, true, [s1!, s2!]);
    saveRoutine(db, routineInput({ id, steps: [step({ id: s1 })] }));
    expect(getRoutineDay(db, id, MON, WARN)!.progress).toMatchObject({ due: 1, complete: true });
    expect(tickSteps(db, id, [s1!], MON, true, [s1!], 7)).toMatchObject({
      dueStepIds: [s1],
      completedAt: 7,
    });
  });

  it('a snapshot whose steps were all replaced falls back to the steps due now', () => {
    const db = createTestDb();
    const id = addRoutine(db, { steps: [step(), step()] });
    const [s1, s2] = stepIds(db, id);
    tickSteps(db, id, [s1!], MON, true, [s1!, s2!]);
    saveRoutine(db, routineInput({ id, steps: [step()] }));
    const r = getRoutineDay(db, id, MON, WARN)!;
    const [s3] = r.progress.dueStepIds;
    expect(r.progress).toMatchObject({ due: 1, done: 0 });
    // Finishing the new step completes the day in the log too, not only on screen.
    expect(tickSteps(db, id, [s3!], MON, true, r.progress.dueStepIds, 9)).toMatchObject({
      dueStepIds: [s3],
      completedAt: 9,
    });
  });
});

function skinDay(db: Db, day: string): boolean {
  return skinStreak(streakInput(db, day)).current > 0;
}

/** Task 007's fixture: Evening A Mon/Wed/Fri, Evening B Tue/Thu, a daily Morning. */
function fixture() {
  const db = createTestDb();
  const morning = addRoutine(db, { name: 'Morning', timeOfDay: 'morning', sortTime: '07:00' });
  const eveA = addRoutine(db, { name: 'Evening A', daysOfWeek: [1, 3, 5] });
  const eveB = addRoutine(db, { name: 'Evening B', daysOfWeek: [2, 4] });
  return { db, morning, eveA, eveB };
}

describe('getTodayRoutines', () => {
  it('gives one group per time of day with the routine due that weekday', () => {
    const { db, morning, eveA, eveB } = fixture();
    const mon = getTodayRoutines(db, MON, WARN);
    expect(mon.map((g) => g.key)).toEqual(['morning', 'evening']);
    expect(mon.map((g) => g.routines.map((r) => r.id))).toEqual([[morning], [eveA]]);
    const tue = getTodayRoutines(db, TUE, WARN);
    expect(tue.map((g) => g.routines.map((r) => r.id))).toEqual([[morning], [eveB]]);
    expect(tue[1]).toMatchObject({ chosenId: eveB, started: false, complete: false });
  });

  it('offers A/B on days both run and remembers the pick per weekday', () => {
    const { db, eveA, eveB } = fixture();
    saveRoutine(db, routineInput({ id: eveB, name: 'Evening B', daysOfWeek: EVERY_DAY }));
    const evening = (day: string) => getTodayRoutines(db, day, WARN)[1]!;

    expect(evening(MON).routines.map((r) => r.id)).toEqual([eveA, eveB]);
    expect(evening(MON).chosenId).toBe(eveA);

    setChoice(db, 'evening', 1, eveB);
    expect(evening(MON).chosenId).toBe(eveB);
    expect(evening(WED).chosenId).toBe(eveA); // Wednesday has no pick yet
    setChoice(db, 'evening', 1, eveA);
    expect(evening(MON).chosenId).toBe(eveA);
    expect(db.select().from(routineChoice).all()).toHaveLength(1);
  });

  it('fixes the choice to the started routine and completes the group with either', () => {
    const { db, eveA, eveB } = fixture();
    saveRoutine(db, routineInput({ id: eveB, name: 'Evening B', daysOfWeek: EVERY_DAY }));
    setChoice(db, 'evening', 1, eveA);
    const [sb] = stepIds(db, eveB);
    tickSteps(db, eveB, [sb!], MON, true, [sb!]);
    const evening = getTodayRoutines(db, MON, WARN)[1]!;
    expect(evening).toMatchObject({ chosenId: eveB, started: true, complete: true });
  });

  it('shows the finished option when both have ticks', () => {
    const { db, eveA, eveB } = fixture();
    saveRoutine(db, routineInput({ id: eveB, name: 'Evening B', daysOfWeek: EVERY_DAY }));
    saveRoutine(db, routineInput({ id: eveA, name: 'Evening A', steps: [step(), step()] }));
    // A started from Today, then B done in full from the Routines tab.
    const [a1, a2] = stepIds(db, eveA);
    tickSteps(db, eveA, [a1!], MON, true, [a1!, a2!]);
    const [sb] = stepIds(db, eveB);
    tickSteps(db, eveB, [sb!], MON, true, [sb!]);
    const evening = getTodayRoutines(db, MON, WARN)[1]!;
    expect(evening).toMatchObject({ chosenId: eveB, complete: true });
  });

  it('only counts steps due that day', () => {
    const db = createTestDb();
    const id = addRoutine(db, {
      steps: [step(), step({ scheduleKind: 'days', daysOfWeek: [2, 5] })],
    });
    const [always] = stepIds(db, id);
    expect(getTodayRoutines(db, MON, WARN)[0]!.routines[0]!.dueSteps.map((s) => s.id)).toEqual([
      always,
    ]);
    expect(getTodayRoutines(db, TUE, WARN)[0]!.routines[0]!.progress.due).toBe(2);
  });

  it('leaves out inactive routines', () => {
    const { db, morning } = fixture();
    setRoutineActive(db, morning, false);
    expect(getTodayRoutines(db, MON, WARN).map((g) => g.key)).toEqual(['evening']);
  });
});

describe('duplicate and delete', () => {
  it('duplicates as a variant with the reminder off', () => {
    const db = createTestDb();
    const p = createProduct(db, productInput());
    const id = addRoutine(db, {
      name: 'Evening',
      reminderTime: '21:30',
      daysOfWeek: [1, 3],
      steps: [step({ productId: p, note: 'x', waitSeconds: 60 }), step()],
    });
    const copy = duplicateRoutine(db, id, (name) => `${name} (copy)`);
    const r = getRoutine(db, copy, MON, WARN)!;
    expect(r).toMatchObject({ name: 'Evening (copy)', reminderTime: null, daysOfWeek: [1, 3] });
    expect(r.steps.map((s) => [s.productId, s.note, s.waitSeconds, s.position])).toEqual([
      [p, 'x', 60, 0],
      [null, null, 0, 1],
    ]);
    expect(stepIds(db, id)).toHaveLength(2);
  });

  it('deleting a routine removes its steps, logs and choices', () => {
    const db = createTestDb();
    const id = addRoutine(db);
    const keep = addRoutine(db, { name: 'Keep' });
    const [s] = stepIds(db, id);
    tickSteps(db, id, [s!], MON, true, [s!]);
    setChoice(db, 'evening', 1, id);
    deleteRoutine(db, id);
    expect(getRoutine(db, id, MON, WARN)).toBeNull();
    expect(db.select().from(routineStep).where(eq(routineStep.routineId, id)).all()).toEqual([]);
    expect(db.select().from(routineLog).all()).toEqual([]);
    expect(db.select().from(routineChoice).all()).toEqual([]);
    expect(listRoutines(db, MON, WARN).map((r) => r.id)).toEqual([keep]);
  });
});

describe('logs and streak input', () => {
  it('returns logs in a range and what the streak needs', () => {
    const db = createTestDb();
    const id = addRoutine(db);
    const [s] = stepIds(db, id);
    for (const day of [MON, TUE, WED]) tickSteps(db, id, [s!], day, true, [s!]);
    expect(logsInRange(db, MON, TUE).map((l) => l.day)).toEqual([MON, TUE]);

    const input = streakInput(db, TUE);
    expect(input.routines).toEqual([
      expect.objectContaining({ id, createdDay: '2026-01-01', active: true }),
    ]);
    expect(input.steps.map((x) => x.id)).toEqual([s]);
    expect(input.logs.map((l) => l.day)).toEqual([MON, TUE]);
    expect(skinStreak(input).current).toBe(2);
  });
});

describe('products in routines', () => {
  it('lists routines using a product in product detail (Used in)', () => {
    const db = createTestDb();
    const p = createProduct(db, productInput());
    const other = createProduct(db, productInput({ name: 'Other' }));
    const morning = addRoutine(db, {
      name: 'Morning',
      timeOfDay: 'morning',
      sortTime: '07:00',
      steps: [step({ productId: p }), step({ productId: p })],
    });
    const evening = addRoutine(db, { steps: [step({ productId: p })] });
    addRoutine(db, { name: 'Unrelated', steps: [step({ productId: other })] });

    expect(getProduct(db, p, MON, WARN)!.usedIn).toEqual([
      { kind: 'routine', id: morning, name: 'Morning' },
      { kind: 'routine', id: evening, name: 'Evening' },
    ]);
  });

  it('recentStepProducts lists active products of the area, newest step first', () => {
    const db = createTestDb();
    const mk = (name: string, area: ProductInput['area'] = 'skin') =>
      createProduct(db, productInput({ name, area }));
    const a = mk('A');
    const b = mk('B');
    const c = mk('C');
    const gone = mk('Gone');
    const hair = mk('Hair', 'hair');
    const both = mk('Both', 'both');
    const one = addRoutine(db, { steps: [step({ productId: a }), step({ productId: gone })] });
    const two = addRoutine(db, {
      name: 'Two',
      steps: [step({ productId: b }), step({ productId: a }), step({ productId: both })],
    });
    // When each step last changed.
    const touched = [...stepIds(db, one), ...stepIds(db, two)];
    [1000, 1000, 3000, 2000, 1500].forEach((ms, i) =>
      db.update(routineStep).set({ updatedAt: ms }).where(eq(routineStep.id, touched[i]!)).run(),
    );
    db.insert(hairTask)
      .values({ name: 'Wash', kind: 'wash', productIds: [hair, both, c] })
      .run();
    markFinished(db, gone, MON);

    const skin = recentStepProducts(db, 'skin', MON, WARN).map((p) => p.name);
    expect(skin).toEqual(['B', 'A', 'Both']);
    expect(recentStepProducts(db, 'skin', MON, WARN, 2)).toHaveLength(2);
    // The hair task's skin product is left out of the hair group.
    expect(recentStepProducts(db, 'hair', MON, WARN).map((p) => p.name)).toEqual(['Hair', 'Both']);
  });
});

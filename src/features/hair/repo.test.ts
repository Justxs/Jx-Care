import { eq } from 'drizzle-orm';

import { createTestDb } from '@/db/test-db';
import { hairLog, hairTask, product } from '@/db/schema';
import { getProduct } from '@/features/products/repo';
import { hairStreak } from '@/lib/hair';

import {
  deleteHairLog,
  deleteHairTask,
  getHairTask,
  hairDueToday,
  hairLogsOnDay,
  hairMonth,
  hairStreakInput,
  hasAnyHairTask,
  hasHairLogOn,
  hasWashTask,
  listHairTasks,
  listReminderTasks,
  markHairDone,
  quickSetup,
  saveHairTask,
  washDueOn,
} from './repo';
import type { HairTaskInput } from './schema';

// Wednesday.
const TODAY = '2026-10-07';
const YESTERDAY = '2026-10-06';

type TestDb = ReturnType<typeof createTestDb>;

const washInput = (over: Partial<HairTaskInput> = {}): HairTaskInput => ({
  name: 'Wash',
  kind: 'wash',
  otherKind: null,
  productIds: [],
  scheduleKind: 'interval',
  everyNDays: 3,
  intervalUnit: 'days',
  daysOfWeek: null,
  lastDoneAt: YESTERDAY,
  reminderTime: null,
  ...over,
});

const addProduct = (db: TestDb, name: string, area: 'skin' | 'hair' | 'both' = 'hair') =>
  db.insert(product).values({ name, area }).returning({ id: product.id }).get().id;

// No screen pauses a task, but the reads still honour the `active` column.
const setActive = (db: TestDb, id: number, active: boolean) =>
  db.update(hairTask).set({ active }).where(eq(hairTask.id, id)).run();

const task = (db: TestDb, id: number) =>
  db.select().from(hairTask).where(eq(hairTask.id, id)).get();

const done = (db: TestDb, id: number, day: string, note: string | null = null) =>
  markHairDone(db, id, { day, productIds: [], note });

describe('quickSetup', () => {
  it('every 3 days, last wash yesterday, trim on: a wash and a trim with their next due days', () => {
    const db = createTestDb();
    const { washId, trimId } = quickSetup(
      db,
      { frequency: 'every_3_days', lastWash: YESTERDAY, trim: true },
      TODAY,
    );
    expect(trimId).not.toBeNull();
    const { washes, other } = listHairTasks(db, TODAY);
    expect(washes).toHaveLength(1);
    expect(other).toHaveLength(1);
    expect(washes[0]).toMatchObject({
      id: washId,
      name: 'Wash',
      everyNDays: 3,
      lastDoneAt: YESTERDAY,
      nextDue: '2026-10-09',
      state: 'upcoming',
    });
    expect(other[0]).toMatchObject({
      id: trimId,
      name: 'Trim',
      kind: 'other',
      otherKind: 'trim',
      everyNDays: 56,
      intervalUnit: 'weeks',
      lastDoneAt: TODAY,
      nextDue: '2026-12-02',
    });
  });

  it('uses the names it is given and skips the trim when off', () => {
    const db = createTestDb();
    const { trimId } = quickSetup(
      db,
      { frequency: 'every_day', lastWash: TODAY, trim: false },
      TODAY,
      { wash: 'Plovimas', trim: 'Kirpimas' },
    );
    expect(trimId).toBeNull();
    const { washes, other } = listHairTasks(db, TODAY);
    expect(washes.map((w) => [w.name, w.nextDue])).toEqual([['Plovimas', '2026-10-08']]);
    expect(other).toEqual([]);
  });

  it('twice a week gives Monday and Thursday', () => {
    const db = createTestDb();
    const { washId } = quickSetup(
      db,
      { frequency: 'twice_a_week', lastWash: YESTERDAY, trim: false },
      TODAY,
    );
    expect(task(db, washId)).toMatchObject({ scheduleKind: 'days', daysOfWeek: [1, 4] });
    expect(listHairTasks(db, TODAY).washes[0]?.nextDue).toBe('2026-10-08');
  });
});

describe('markHairDone', () => {
  it('done early: logs the due day it answered and moves the next due from the done day', () => {
    const db = createTestDb();
    const id = saveHairTask(db, washInput());
    const result = done(db, id, TODAY);
    expect(result.nextDue).toBe('2026-10-10');
    expect(task(db, id)?.lastDoneAt).toBe(TODAY);
    const logs = getHairTask(db, id, TODAY)?.logs ?? [];
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ day: TODAY, dueDay: '2026-10-09', timing: 'on_time' });
  });

  it('done late is marked late', () => {
    const db = createTestDb();
    const id = saveHairTask(db, washInput({ lastDoneAt: '2026-10-01' }));
    expect(listHairTasks(db, TODAY).washes[0]).toMatchObject({ state: 'overdue', overdueDays: 3 });
    expect(done(db, id, TODAY).nextDue).toBe('2026-10-10');
    expect(getHairTask(db, id, TODAY)?.logs[0]?.timing).toBe('late');
  });

  it("logging an older wash doesn't move the schedule back", () => {
    const db = createTestDb();
    const id = saveHairTask(db, washInput());
    const result = done(db, id, '2026-10-03');
    expect(result.nextDue).toBe('2026-10-09');
    expect(task(db, id)?.lastDoneAt).toBe(YESTERDAY);
  });

  it('an older wash logged after a newer one takes over its due day, as if logged in order', () => {
    const db = createTestDb();
    // Last done 1 Oct, so due 4 Oct. Washed 4 Oct and 7 Oct, but 7 Oct was logged first.
    const id = saveHairTask(db, washInput({ lastDoneAt: '2026-10-01' }));
    done(db, id, TODAY);
    expect(getHairTask(db, id, TODAY)?.logs[0]).toMatchObject({ dueDay: '2026-10-04' });
    expect(done(db, id, '2026-10-04').nextDue).toBe('2026-10-10');
    expect(getHairTask(db, id, TODAY)?.logs.map((l) => [l.day, l.dueDay, l.timing])).toEqual([
      [TODAY, TODAY, 'on_time'],
      ['2026-10-04', '2026-10-04', 'on_time'],
    ]);
    const input = hairStreakInput(db, TODAY);
    expect(hairStreak(input.tasks, input.logs, TODAY)).toEqual({ current: 2, best: 2 });
  });

  it('a second log on the same day replaces the first', () => {
    const db = createTestDb();
    const id = saveHairTask(db, washInput());
    const first = done(db, id, TODAY, 'first');
    const second = done(db, id, TODAY, 'second');
    expect(second.logId).toBe(first.logId);
    const logs = db.select().from(hairLog).all();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ note: 'second', dueDay: '2026-10-09' });
  });

  it('throws for a missing task', () => {
    const db = createTestDb();
    expect(() => done(db, 99, TODAY)).toThrow('Hair task 99 not found');
  });
});

describe('deleteHairLog', () => {
  it('deleting the latest log restores the previous lastDoneAt from the remaining logs', () => {
    const db = createTestDb();
    const id = saveHairTask(db, washInput({ lastDoneAt: '2026-10-01' }));
    done(db, id, '2026-10-04');
    const { logId } = done(db, id, TODAY);
    expect(deleteHairLog(db, logId)).toBe(id);
    expect(task(db, id)?.lastDoneAt).toBe('2026-10-04');
  });

  it('with no log left, goes back to the "Last done" from setup', () => {
    const db = createTestDb();
    const id = saveHairTask(db, washInput());
    const { logId } = done(db, id, TODAY);
    deleteHairLog(db, logId);
    expect(task(db, id)?.lastDoneAt).toBe(YESTERDAY);
    expect(listHairTasks(db, TODAY).washes[0]?.nextDue).toBe('2026-10-09');
  });

  it('for set days, restores a day that gives the same next due day', () => {
    const db = createTestDb();
    // Last done Monday 5 Oct, so due Thursday 8 Oct; washed on the Thursday.
    const id = saveHairTask(
      db,
      washInput({
        scheduleKind: 'days',
        everyNDays: null,
        daysOfWeek: [1, 4],
        lastDoneAt: '2026-10-05',
      }),
    );
    const { logId, nextDue } = done(db, id, '2026-10-08');
    expect(nextDue).toBe('2026-10-12');
    deleteHairLog(db, logId);
    expect(task(db, id)?.lastDoneAt).toBe('2026-10-05');
    expect(listHairTasks(db, TODAY).washes[0]?.nextDue).toBe('2026-10-08');
  });

  it('deleting an older log hands its due day to the next log', () => {
    const db = createTestDb();
    const id = saveHairTask(db, washInput({ lastDoneAt: '2026-10-01' }));
    const { logId } = done(db, id, '2026-10-04');
    done(db, id, TODAY);
    deleteHairLog(db, logId);
    expect(getHairTask(db, id, TODAY)?.logs.map((l) => [l.day, l.dueDay, l.timing])).toEqual([
      [TODAY, '2026-10-04', 'late'],
    ]);
    expect(task(db, id)?.lastDoneAt).toBe(TODAY);
  });

  it('deleting an older log leaves the schedule alone', () => {
    const db = createTestDb();
    const id = saveHairTask(db, washInput());
    const { logId } = done(db, id, '2026-10-02');
    deleteHairLog(db, logId);
    expect(task(db, id)?.lastDoneAt).toBe(YESTERDAY);
  });

  it('returns null for a missing log', () => {
    expect(deleteHairLog(createTestDb(), 5)).toBeNull();
  });
});

describe('saveHairTask', () => {
  it('inserts with "Last done" as the first anchor, then updates', () => {
    const db = createTestDb();
    const id = saveHairTask(db, washInput({ name: 'Mask wash', reminderTime: '19:30' }));
    expect(getHairTask(db, id, TODAY)).toMatchObject({
      name: 'Mask wash',
      reminderTime: '19:30',
      nextDue: '2026-10-09',
    });
    saveHairTask(db, washInput({ name: 'Wash', everyNDays: 2 }), id);
    expect(getHairTask(db, id, TODAY)).toMatchObject({ name: 'Wash', nextDue: '2026-10-08' });
  });

  it('keeps products only for washes, and only hair or both products', () => {
    const db = createTestDb();
    const shampoo = addProduct(db, 'Shampoo');
    const oil = addProduct(db, 'Oil', 'both');
    const cream = addProduct(db, 'Cream', 'skin');
    const id = saveHairTask(db, washInput({ productIds: [shampoo, cream, oil, 999] }));
    expect(task(db, id)?.productIds).toEqual([shampoo, oil]);
    expect(listHairTasks(db, TODAY).washes[0]?.productNames).toEqual(['Shampoo', 'Oil']);

    const otherId = saveHairTask(
      db,
      washInput({ kind: 'other', otherKind: 'mask', productIds: [shampoo] }),
    );
    expect(task(db, otherId)).toMatchObject({ productIds: [], otherKind: 'mask' });
  });

  it('stores set days without an interval and an interval without days', () => {
    const db = createTestDb();
    const id = saveHairTask(
      db,
      washInput({ scheduleKind: 'days', everyNDays: 3, daysOfWeek: [2, 5] }),
    );
    expect(task(db, id)).toMatchObject({ everyNDays: null, daysOfWeek: [2, 5] });
    saveHairTask(db, washInput({ daysOfWeek: [2] }), id);
    expect(task(db, id)).toMatchObject({ everyNDays: 3, daysOfWeek: null });
  });
});

describe('reads', () => {
  it('lists active tasks in groups, soonest first, and due ones for Today', () => {
    const db = createTestDb();
    expect(hasAnyHairTask(db)).toBe(false);
    const late = saveHairTask(db, washInput({ name: 'Late', lastDoneAt: '2026-10-01' }));
    const due = saveHairTask(db, washInput({ name: 'Due', lastDoneAt: '2026-10-04' }));
    const later = saveHairTask(db, washInput({ name: 'Later' }));
    const off = saveHairTask(db, washInput({ name: 'Off', lastDoneAt: '2026-09-01' }));
    setActive(db, off, false);
    const trim = saveHairTask(
      db,
      washInput({ name: 'Trim', kind: 'other', otherKind: 'trim', everyNDays: 56 }),
    );
    expect(hasAnyHairTask(db)).toBe(true);

    const { washes, other } = listHairTasks(db, TODAY);
    expect(washes.map((w) => [w.id, w.state])).toEqual([
      [late, 'overdue'],
      [due, 'due'],
      [later, 'upcoming'],
    ]);
    expect(other.map((o) => o.id)).toEqual([trim]);
    expect(hairDueToday(db, TODAY).map((r) => r.id)).toEqual([late, due]);

    setActive(db, off, true);
    expect(hairDueToday(db, TODAY)[0]?.id).toBe(off);
  });

  it('gets one task with its last 10 logs, newest first', () => {
    const db = createTestDb();
    const shampoo = addProduct(db, 'Shampoo');
    const id = saveHairTask(db, washInput({ productIds: [shampoo], lastDoneAt: '2026-09-01' }));
    for (let d = 10; d <= 21; d++) {
      markHairDone(db, id, { day: `2026-09-${d}`, productIds: [shampoo], note: null });
    }
    const detail = getHairTask(db, id, TODAY);
    expect(detail?.products.map((p) => p.name)).toEqual(['Shampoo']);
    expect(detail?.logs).toHaveLength(10);
    expect(detail?.logs[0]?.day).toBe('2026-09-21');
    expect(detail?.logs[0]?.products.map((p) => p.name)).toEqual(['Shampoo']);
    expect(getHairTask(db, 999, TODAY)).toBeNull();
  });

  it('lists logs on a day with their task, washes first', () => {
    const db = createTestDb();
    const { washId, trimId } = quickSetup(
      db,
      { frequency: 'every_2_days', lastWash: '2026-10-03', trim: true },
      '2026-10-03',
    );
    done(db, trimId as number, TODAY, 'short');
    done(db, washId, TODAY);
    expect(
      hairLogsOnDay(db, TODAY).map((l) => [l.taskName, l.kind, l.otherKind, l.timing, l.note]),
    ).toEqual([
      ['Wash', 'wash', null, 'late', null],
      ['Trim', 'other', 'trim', 'on_time', 'short'],
    ]);
    expect(hairLogsOnDay(db, YESTERDAY)).toEqual([]);
  });

  it('builds month marks from logs and the schedule', () => {
    const db = createTestDb();
    const { washId, trimId } = quickSetup(
      db,
      { frequency: 'every_3_days', lastWash: '2026-10-01', trim: true },
      '2026-10-01',
    );
    done(db, washId, '2026-10-04');
    done(db, trimId as number, '2026-10-05');
    const days = Array.from({ length: 14 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
    const marks = hairMonth(db, days, TODAY);
    expect(marks['2026-10-04']).toMatchObject({ washDone: true, washLate: false });
    expect(marks['2026-10-05']?.otherCare).toEqual(['trim']);
    expect(marks['2026-10-07']?.washDue).toBe(true);
    expect(marks['2026-10-10']?.washDue).toBe(true);
    expect(marks['2026-10-08']?.washDue).toBe(false);
    expect(hairMonth(db, [], TODAY)).toEqual({});
  });
});

describe('hairStreakInput', () => {
  it('other care never appears as a wash', () => {
    const db = createTestDb();
    const { washId, trimId } = quickSetup(
      db,
      { frequency: 'every_3_days', lastWash: '2026-09-30', trim: true },
      '2026-09-30',
    );
    done(db, washId, '2026-10-03');
    done(db, trimId as number, '2026-10-04');
    done(db, washId, '2026-10-06');

    const input = hairStreakInput(db, TODAY);
    expect(input.tasks.map((t) => t.id)).toEqual([washId]);
    expect(input.tasks.every((t) => t.kind === 'wash')).toBe(true);
    expect(input.logs.map((l) => l.hairTaskId)).toEqual([washId, washId]);
    expect(hairStreak(input.tasks, input.logs, input.today)).toEqual({ current: 2, best: 2 });
  });

  it('is empty with no wash tasks', () => {
    expect(hairStreakInput(createTestDb(), TODAY)).toEqual({ tasks: [], logs: [], today: TODAY });
  });
});

describe('used in and delete', () => {
  it('fills product "Used in"', () => {
    const db = createTestDb();
    const shampoo = addProduct(db, 'Shampoo');
    const a = saveHairTask(db, washInput({ name: 'B wash', productIds: [shampoo] }));
    const b = saveHairTask(db, washInput({ name: 'A wash', productIds: [shampoo] }));
    saveHairTask(db, washInput({ name: 'Plain' }));
    expect(getProduct(db, shampoo, TODAY, 30)?.usedIn).toEqual([
      { kind: 'hair', id: b, name: 'A wash' },
      { kind: 'hair', id: a, name: 'B wash' },
    ]);
  });

  it('deleting a task deletes its logs', () => {
    const db = createTestDb();
    const id = saveHairTask(db, washInput());
    done(db, id, TODAY);
    deleteHairTask(db, id);
    expect(task(db, id)).toBeUndefined();
    expect(db.select().from(hairLog).all()).toEqual([]);
    expect(hasAnyHairTask(db)).toBe(false);
  });
});

const created = (db: TestDb, id: number, day: string) =>
  db
    .update(hairTask)
    .set({ createdAt: new Date(`${day}T12:00:00`).getTime() })
    .where(eq(hairTask.id, id))
    .run();

describe('task 033 reads', () => {
  it('washDueOn says when the wash was due on a day with nothing done', () => {
    const db = createTestDb();
    // Every 3 days, last done 30 Sep: due 3 Oct, washed late on 5 Oct, next due 8 Oct.
    const id = saveHairTask(db, washInput({ lastDoneAt: '2026-09-30' }));
    created(db, id, '2026-09-30');
    done(db, id, '2026-10-05');
    expect(washDueOn(db, '2026-10-02')).toBeNull();
    expect(washDueOn(db, '2026-10-03')).toBe('2026-10-03');
    expect(washDueOn(db, '2026-10-04')).toBe('2026-10-03');
    expect(washDueOn(db, '2026-10-07')).toBeNull();
    expect(washDueOn(db, '2026-10-09')).toBe('2026-10-08');
    // Before the task existed nothing was due; other care never counts.
    expect(washDueOn(db, '2026-09-29')).toBeNull();
    const trim = saveHairTask(
      db,
      washInput({ kind: 'other', otherKind: 'trim', lastDoneAt: '2026-09-01' }),
    );
    created(db, trim, '2026-09-01');
    expect(washDueOn(db, '2026-10-02')).toBeNull();
  });

  it('hasWashTask counts active washes only', () => {
    const db = createTestDb();
    expect(hasWashTask(db)).toBe(false);
    saveHairTask(db, washInput({ kind: 'other', otherKind: 'trim' }));
    expect(hasWashTask(db)).toBe(false);
    const id = saveHairTask(db, washInput());
    expect(hasWashTask(db)).toBe(true);
    setActive(db, id, false);
    expect(hasWashTask(db)).toBe(false);
  });

  it('listReminderTasks keeps active tasks with a reminder time, with product names', () => {
    const db = createTestDb();
    const shampoo = addProduct(db, 'Shampoo');
    const a = saveHairTask(db, washInput({ reminderTime: '19:00', productIds: [shampoo] }));
    saveHairTask(db, washInput({ reminderTime: null }));
    const paused = saveHairTask(db, washInput({ reminderTime: '08:00' }));
    setActive(db, paused, false);
    expect(listReminderTasks(db, TODAY)).toEqual([
      expect.objectContaining({ id: a, nextDue: '2026-10-09', productNames: ['Shampoo'] }),
    ]);
  });

  it('hasHairLogOn tells whether a task was logged on a day', () => {
    const db = createTestDb();
    const id = saveHairTask(db, washInput());
    expect(hasHairLogOn(db, id, TODAY)).toBe(false);
    done(db, id, TODAY);
    expect(hasHairLogOn(db, id, TODAY)).toBe(true);
    expect(hasHairLogOn(db, id, YESTERDAY)).toBe(false);
  });
});

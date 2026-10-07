import { eq } from 'drizzle-orm';
import * as Notifications from 'expo-notifications';

import { setDb, type Db } from '@/db';
import { queryClient } from '@/db/queryClient';
import { routine, routineStep } from '@/db/schema';
import { createTestDb } from '@/db/test-db';
import { getSettings, saveSettings } from '@/features/settings/repo';
import { MON, TUE, WED } from '@/features/today/testUtils';
import { i18n } from '@/i18n';
import { momentOf } from '@/lib/appDay';
import { answerReminderAsk, reminderAskStore, sync, type PermissionState } from '@/notifications';
import { resetReminderAsk, setPermissionAdapter } from '@/notifications/askPermission';
import { createFakeOS, type FakeOS } from '@/notifications/fakeOS';
import { handleResponse } from '@/notifications/responses';
import { scheduleSnooze, setNotificationOS, snoozeIdFor } from '@/notifications/scheduler';
import type { PlannedNotification } from '@/notifications/types';
import { dismissToast, uiStore } from '@/state/ui';

import {
  askForRoutineReminders,
  cancelTodaysRoutineReminders,
  resyncRoutineReminders,
  routineReminderPlanner,
} from './reminders';
import { saveRoutine, setChoice, setRoutineActive, tickSteps, type SaveRoutineInput } from './repo';
import type { StepInput } from './schema';

/** Monday 12:00 local. */
const NOW = new Date(2026, 9, 5, 12, 0).getTime();

type StepSpec = Partial<Pick<StepInput, 'scheduleKind' | 'daysOfWeek'>>;

function addRoutine(
  db: Db,
  over: Partial<Omit<SaveRoutineInput, 'steps'>> & { steps?: StepSpec[] } = {},
): number {
  const timeOfDay = over.timeOfDay ?? 'evening';
  const id = saveRoutine(db, {
    name: 'Evening basics',
    timeOfDay,
    customName: null,
    sortTime: timeOfDay === 'morning' ? '07:00' : '21:00',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    reminderTime: '21:00',
    ...over,
    steps: (over.steps ?? [{}, {}]).map((s) => ({
      id: null,
      productId: null,
      note: null,
      scheduleKind: s.scheduleKind ?? 'always',
      daysOfWeek: s.daysOfWeek ?? null,
      everyNDays: null,
      startDate: null,
      waitSeconds: 0,
    })),
  });
  // Created long ago, so every test day counts.
  db.update(routine)
    .set({ createdAt: new Date(2026, 0, 1, 12).getTime() })
    .where(eq(routine.id, id))
    .run();
  return id;
}

let db: Db;

// The permission ask writes to the app's query client; its cache timers would keep Jest running.
afterAll(() => queryClient.clear());

function plan(now = NOW, language: 'en' | 'lt' = 'en'): PlannedNotification[] {
  const settings = getSettings(db);
  return routineReminderPlanner({ db, now, settings, t: i18n.getFixedT(language) });
}

const days = (items: PlannedNotification[]) => items.map((p) => p.key.split(':').at(-1));

beforeEach(() => {
  db = createTestDb();
  setDb(db);
  saveSettings(db, { language: 'en' });
});

describe('routineReminderPlanner', () => {
  it('plans one reminder per run day at the reminder time, opening the player', () => {
    const id = addRoutine(db, { daysOfWeek: [1, 3, 5] });
    const items = plan();
    // Mon 5, Wed 7, Fri 9, Mon 12, Wed 14, Fri 16, Mon 19 (today through today + 14).
    expect(days(items)).toEqual([
      MON,
      WED,
      '2026-10-09',
      '2026-10-12',
      '2026-10-14',
      '2026-10-16',
      '2026-10-19',
    ]);
    expect(items[0]).toEqual({
      key: `routine:${id}:routine:${MON}`,
      entityType: 'routine',
      entityId: id,
      kind: 'routine',
      fireAt: momentOf(MON, '21:00'),
      title: 'Evening routine: 2 steps',
      body: 'Evening basics',
      categoryId: 'routine',
      channelId: 'routines',
      data: { url: `/player/${id}` },
    });
  });

  it('counts the steps due that day and skips days with nothing due', () => {
    addRoutine(db, {
      steps: [{}, { scheduleKind: 'days', daysOfWeek: [1] }],
      daysOfWeek: [1, 2],
    });
    const items = plan();
    expect(items.slice(0, 2).map((p) => [days([p])[0], p.title])).toEqual([
      [MON, 'Evening routine: 2 steps'],
      [TUE, 'Evening routine: 1 step'],
    ]);

    const only = addRoutine(db, {
      name: 'Peel',
      timeOfDay: 'morning',
      reminderTime: '07:30',
      steps: [{ scheduleKind: 'days', daysOfWeek: [3] }],
    });
    const peel = plan().filter((p) => p.entityId === only);
    expect(days(peel)).toEqual([WED, '2026-10-14']);
    expect(peel[0]!.title).toBe('Morning routine: 1 step');
    expect(peel[0]!.fireAt).toBe(momentOf(WED, '07:30'));
  });

  it('names a custom time of day and writes Lithuanian plurals', () => {
    addRoutine(db, {
      name: 'Gym',
      timeOfDay: 'custom',
      customName: 'After gym',
      sortTime: '18:00',
      reminderTime: '18:30',
      steps: [{}, {}, {}],
    });
    expect(plan()[0]!.title).toBe('After gym: 3 steps');
    expect(plan(NOW, 'lt')[0]!.title).toBe('After gym: 3 žingsniai');
  });

  it('writes Lithuanian titles for morning and evening', () => {
    addRoutine(db, { steps: [{}] });
    addRoutine(db, { name: 'Light', timeOfDay: 'morning', reminderTime: '07:00' });
    const titles = plan(NOW - 6 * 60 * 60 * 1000, 'lt')
      .slice(0, 2)
      .map((p) => p.title);
    expect(titles).toEqual(['Ryto rutina: 2 žingsniai', 'Vakaro rutina: 1 žingsnis']);
  });

  it('plans nothing for routines without a reminder, switched off, or with the master switch off', () => {
    addRoutine(db, { reminderTime: null });
    const off = addRoutine(db, { name: 'Off' });
    setRoutineActive(db, off, false, NOW);
    expect(plan()).toEqual([]);

    setRoutineActive(db, off, true, NOW);
    expect(plan()).not.toEqual([]);
    saveSettings(db, { routineRemindersOn: false });
    expect(plan()).toEqual([]);
  });

  it('sends one reminder per A/B time of day, for the weekday’s remembered pick', () => {
    const a = addRoutine(db, { name: 'A', reminderTime: '21:00' });
    const b = addRoutine(db, { name: 'B', reminderTime: '21:30', steps: [{}, {}, {}] });
    setChoice(db, 'evening', 2, b);
    const items = plan();
    expect(items).toHaveLength(15);
    const [mon, tue] = items;
    expect(mon).toMatchObject({ entityId: a, body: 'A', fireAt: momentOf(MON, '21:00') });
    expect(tue).toMatchObject({
      entityId: b,
      body: 'B',
      title: 'Evening routine: 3 steps',
      fireAt: momentOf(TUE, '21:30'),
      data: { url: `/player/${b}` },
    });
  });

  it('uses another option’s reminder time when the pick has none', () => {
    const a = addRoutine(db, { name: 'A', reminderTime: null });
    addRoutine(db, { name: 'B', reminderTime: '21:30' });
    expect(plan()[0]).toMatchObject({ entityId: a, fireAt: momentOf(MON, '21:30') });
  });

  it('skips today once the time of day is complete, and keeps tomorrow', () => {
    const id = addRoutine(db, { steps: [{}] });
    expect(days(plan()).slice(0, 2)).toEqual([MON, TUE]);
    tickAll(id, MON);
    expect(days(plan())[0]).toBe(TUE);
  });

  it('skips today’s A/B reminder when either option is done', () => {
    addRoutine(db, { name: 'A' });
    const b = addRoutine(db, { name: 'B' });
    tickAll(b, MON);
    expect(days(plan())[0]).toBe(TUE);
  });

  it('drops a reminder whose time has passed today', () => {
    addRoutine(db, { reminderTime: '09:00' });
    expect(days(plan())[0]).toBe(TUE);
  });
});

/** Ticks every step of a routine on a day. */
function tickAll(routineId: number, day: string): void {
  const ids = db
    .select({ id: routineStep.id })
    .from(routineStep)
    .where(eq(routineStep.routineId, routineId))
    .all()
    .map((s) => s.id);
  tickSteps(db, routineId, ids, day, true, ids);
}

describe('with the notification layer', () => {
  let os: FakeOS;

  beforeEach(() => {
    os = createFakeOS('granted');
    setNotificationOS(os);
  });

  afterEach(() => {
    setNotificationOS(null);
    jest.restoreAllMocks();
  });

  const pendingRoutineDays = () =>
    [...os.pending.values()]
      .filter((r) => r.data.entityType === 'routine')
      .map((r) => r.data.key.split(':').at(-1))
      .sort();

  it('completing a routine cancels today’s pending and snoozed reminders', async () => {
    const a = addRoutine(db, { name: 'A' });
    const b = addRoutine(db, { name: 'B' });
    await sync(NOW);
    expect(pendingRoutineDays()[0]).toBe(MON);
    const today = [...os.pending.values()].find((r) => r.data.key.endsWith(MON))!;
    expect(today.data.entityId).toBe(a);
    await scheduleSnooze(today, 15, NOW);
    expect(os.pending.has(snoozeIdFor(today.data.key))).toBe(true);

    // Finishing B (the other option) completes the evening.
    tickAll(b, MON);
    await cancelTodaysRoutineReminders(b, NOW);

    expect(pendingRoutineDays()[0]).toBe(TUE);
    expect(os.pending.has(snoozeIdFor(today.data.key))).toBe(false);
    expect(os.pending.has(today.id)).toBe(false);
    // Tomorrow onwards is untouched (Tue 6 to Sun 18; Mon 19 at 21:00 is past the 14 days).
    expect(pendingRoutineDays()).toHaveLength(13);
  });

  it('an edit reschedules the routine’s reminders', async () => {
    const id = addRoutine(db, { daysOfWeek: [1] });
    await sync(NOW);
    expect(pendingRoutineDays()).toEqual([MON, '2026-10-12']);

    resave(id, { daysOfWeek: [2], reminderTime: '22:00' });
    await resyncRoutineReminders(NOW);
    const pending = [...os.pending.values()].filter((r) => r.data.entityType === 'routine');
    expect(pending.map((r) => r.fireAt).sort()).toEqual(
      [TUE, '2026-10-13'].map((d) => momentOf(d, '22:00')),
    );
  });

  it('turning off the master switch cancels routine reminders on the next sync', async () => {
    addRoutine(db);
    await sync(NOW);
    expect(pendingRoutineDays()).toHaveLength(14);
    saveSettings(db, { routineRemindersOn: false });
    await sync(NOW);
    expect(pendingRoutineDays()).toEqual([]);
  });

  describe('snooze', () => {
    it('schedules a copy after the snooze length', async () => {
      const id = addRoutine(db);
      saveSettings(db, { snoozeMinutes: 30 });
      await handleResponse(snoozeResponse(id, 1), { now: NOW });
      const copy = os.pending.get(snoozeIdFor(`routine:${id}:routine:${MON}`));
      expect(copy).toMatchObject({
        fireAt: NOW + 30 * 60 * 1000,
        title: 'Evening routine: 2 steps',
        categoryId: 'routine',
        channelId: 'routines',
      });
    });

    it('does nothing once the time of day is done', async () => {
      const a = addRoutine(db, { name: 'A' });
      const b = addRoutine(db, { name: 'B' });
      tickAll(b, MON);
      await handleResponse(snoozeResponse(a, 2), { now: NOW });
      expect(os.schedule).not.toHaveBeenCalled();
    });
  });

  describe('permission ask', () => {
    afterEach(() => {
      resetReminderAsk();
      setPermissionAdapter(null);
      for (const t of uiStore.state.toasts) dismissToast(t.id);
    });

    it('shows the routine ask while undetermined and syncs once allowed', async () => {
      addRoutine(db);
      const permission = fakePermission('undetermined', 'granted');
      setPermissionAdapter(permission);
      const done = askForRoutineReminders();
      await Promise.resolve();
      await Promise.resolve();
      expect(reminderAskStore.state.ask).toMatchObject({ reason: 'routine' });
      expect(os.schedule).not.toHaveBeenCalled();

      await answerReminderAsk('allow');
      await done;
      expect(permission.request).toHaveBeenCalledTimes(1);
      expect(os.schedule).toHaveBeenCalled();
    });

    it('syncs at once when permission is already granted', async () => {
      addRoutine(db);
      setPermissionAdapter(fakePermission('granted', 'granted'));
      await askForRoutineReminders();
      expect(reminderAskStore.state.ask).toBeNull();
      expect(os.schedule).toHaveBeenCalled();
    });

    it('schedules nothing after Not now or when notifications are off', async () => {
      addRoutine(db);
      const permission = fakePermission('undetermined', 'granted');
      setPermissionAdapter(permission);
      const done = askForRoutineReminders();
      await Promise.resolve();
      await Promise.resolve();
      await answerReminderAsk('notNow');
      await done;
      expect(permission.request).not.toHaveBeenCalled();

      setPermissionAdapter(fakePermission('denied', 'denied'));
      await askForRoutineReminders();
      expect(os.schedule).not.toHaveBeenCalled();
    });
  });
});

function snoozeResponse(routineId: number, n: number): Notifications.NotificationResponse {
  const key = `routine:${routineId}:routine:${MON}`;
  return {
    actionIdentifier: 'snooze',
    notification: {
      date: NOW + n,
      request: {
        identifier: `${key}#abc`,
        content: {
          title: 'Evening routine: 2 steps',
          body: 'Evening basics',
          data: {
            url: `/player/${routineId}`,
            key,
            entityType: 'routine',
            entityId: routineId,
            kind: 'routine',
            channelId: 'routines',
          },
          categoryIdentifier: 'routine',
        },
        trigger: null,
      },
    },
  } as unknown as Notifications.NotificationResponse;
}

const fakePermission = (current: PermissionState, answer: PermissionState) => ({
  get: jest.fn(async () => current),
  request: jest.fn(async () => answer),
});

/** Saves a routine again with some fields changed, keeping its steps. */
function resave(
  routineId: number,
  over: Partial<Pick<SaveRoutineInput, 'daysOfWeek' | 'reminderTime'>>,
): void {
  const r = db.select().from(routine).where(eq(routine.id, routineId)).get()!;
  const steps = db.select().from(routineStep).where(eq(routineStep.routineId, routineId)).all();
  saveRoutine(
    db,
    {
      id: routineId,
      name: r.name,
      timeOfDay: r.timeOfDay,
      customName: r.customName,
      sortTime: r.sortTime,
      daysOfWeek: r.daysOfWeek,
      reminderTime: r.reminderTime,
      ...over,
      steps: steps.map((s) => ({
        id: s.id,
        productId: s.productId,
        note: s.note,
        scheduleKind: s.scheduleKind,
        daysOfWeek: s.daysOfWeek,
        everyNDays: s.everyNDays,
        startDate: s.startDate,
        waitSeconds: s.waitSeconds,
      })),
    },
    NOW,
  );
}

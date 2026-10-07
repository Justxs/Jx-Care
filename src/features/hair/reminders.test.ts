import * as Notifications from 'expo-notifications';

import { setDb, type Db } from '@/db';
import { queryClient } from '@/db/queryClient';
import { hairTask, product } from '@/db/schema';
import { createTestDb } from '@/db/test-db';
import { saveSettings } from '@/features/settings/repo';
import { i18n } from '@/i18n';
import { createFakeOS, type FakeOS } from '@/notifications/fakeOS';
import { handleResponse, resetHandledResponses } from '@/notifications/responses';
import { setNotificationOS, snoozeIdFor, sync } from '@/notifications/scheduler';
import type { OsNotificationRequest } from '@/notifications/types';

import { getHairTask, hairLogsOnDay, markHairDone, saveHairTask } from './repo';
import { askForHairReminders, reminderBody } from './reminders';
import type { HairTaskInput } from './schema';

// Wednesday 7 Oct 2026, noon.
const NOW = new Date(2026, 9, 7, 12, 0).getTime();
const TODAY = '2026-10-07';
const at = (y: number, m: number, d: number, h: number, min = 0) =>
  new Date(y, m - 1, d, h, min).getTime();

const input = (over: Partial<HairTaskInput> = {}): HairTaskInput => ({
  name: 'Wash',
  kind: 'wash',
  otherKind: null,
  productIds: [],
  scheduleKind: 'interval',
  everyNDays: 3,
  intervalUnit: 'days',
  daysOfWeek: null,
  lastDoneAt: '2026-10-06',
  reminderTime: '19:00',
  ...over,
});

const trim = (over: Partial<HairTaskInput> = {}): HairTaskInput =>
  input({
    name: 'Trim',
    kind: 'other',
    otherKind: 'trim',
    everyNDays: 56,
    intervalUnit: 'weeks',
    lastDoneAt: '2026-08-14',
    reminderTime: '10:00',
    ...over,
  });

let db: Db;
let os: FakeOS;

function addProduct(name: string): number {
  return db.insert(product).values({ name, area: 'hair' }).returning({ id: product.id }).get().id;
}

/** The pending hair notifications (snoozed copies included), soonest first. */
function pending(): OsNotificationRequest[] {
  return [...os.pending.values()]
    .filter((r) => r.data.entityType === 'hair_task')
    .sort((a, b) => a.fireAt - b.fireAt);
}

let counter = 0;
function response(
  actionIdentifier: string,
  request: OsNotificationRequest,
): Notifications.NotificationResponse {
  counter++;
  return {
    actionIdentifier,
    notification: {
      date: NOW + counter,
      request: {
        identifier: request.id,
        content: {
          title: request.title,
          subtitle: null,
          body: request.body,
          data: request.data,
          categoryIdentifier: request.categoryId ?? null,
          sound: 'default',
        },
        trigger: null,
      },
    },
  } as unknown as Notifications.NotificationResponse;
}

beforeEach(async () => {
  db = createTestDb();
  setDb(db);
  saveSettings(db, { language: 'en', snoozeMinutes: 15 });
  os = createFakeOS();
  setNotificationOS(os);
  resetHandledResponses();
  await i18n.changeLanguage('en');
});

afterEach(() => {
  setNotificationOS(null);
});

// The Done action and the permission ask touch the app's query client.
afterAll(() => queryClient.clear());

describe('hair planner', () => {
  it('plans one reminder per task on its due day at its time, with text per kind', async () => {
    const shampoo = addProduct('Shampoo');
    const conditioner = addProduct('Conditioner');
    const wash = saveHairTask(db, input({ productIds: [shampoo, conditioner] }));
    const trimId = saveHairTask(db, trim());

    await sync(NOW);

    const [first, second] = pending();
    expect(pending()).toHaveLength(2);
    expect(first).toMatchObject({
      fireAt: at(2026, 10, 9, 10),
      title: 'Trim',
      body: 'Time for a trim (8 weeks)',
      categoryId: 'other_care',
      channelId: 'hair',
      data: expect.objectContaining({
        url: `/hair/done/${trimId}`,
        entityType: 'hair_task',
        entityId: trimId,
        kind: 'hair',
      }),
    });
    expect(second).toMatchObject({
      fireAt: at(2026, 10, 9, 19),
      title: 'Wash',
      body: 'Hair wash day: Shampoo + Conditioner',
      categoryId: 'hair',
      channelId: 'hair',
      data: expect.objectContaining({ url: `/hair/done/${wash}`, entityId: wash }),
    });
  });

  it('plans today when the time is still to come, and nothing for a time already gone', async () => {
    const later = saveHairTask(db, input({ lastDoneAt: '2026-10-04', reminderTime: '19:00' }));
    saveHairTask(db, input({ lastDoneAt: '2026-10-04', reminderTime: '08:00' }));

    await sync(NOW);

    expect(pending().map((r) => [r.data.entityId, r.fireAt])).toEqual([
      [later, at(2026, 10, 7, 19)],
    ]);
  });

  it('skips overdue tasks, tasks with no reminder, paused tasks and due days past the window', async () => {
    saveHairTask(db, input({ lastDoneAt: '2026-10-01' })); // due 4 Oct: overdue
    saveHairTask(db, input({ reminderTime: null }));
    const paused = saveHairTask(db, input());
    db.update(hairTask).set({ active: false }).run();
    saveHairTask(db, input({ everyNDays: 30 })); // due 5 Nov: outside 14 days

    await sync(NOW);

    expect(pending()).toEqual([]);
    expect(paused).toBeGreaterThan(0);
  });

  it('plans nothing while the Hair tasks master switch is off', async () => {
    saveHairTask(db, input());
    await sync(NOW);
    expect(pending()).toHaveLength(1);

    saveSettings(db, { hairRemindersOn: false });
    await sync(NOW);
    expect(pending()).toEqual([]);
  });

  it('writes the text in the app language', async () => {
    saveSettings(db, { language: 'lt' });
    saveHairTask(db, trim());
    await sync(NOW);
    expect(pending()[0]?.body).toBe('Laikas kirptis (8 savaitės)');
  });

  it('moves the reminder when the task is done early', async () => {
    const id = saveHairTask(db, input());
    await sync(NOW);
    expect(pending()[0]?.fireAt).toBe(at(2026, 10, 9, 19));

    markHairDone(db, id, { day: TODAY, productIds: [], note: null });
    await sync(NOW);
    expect(pending().map((r) => r.fireAt)).toEqual([at(2026, 10, 10, 19)]);
  });
});

describe('reminderBody', () => {
  const t = i18n.getFixedT('en');
  const base = {
    name: 'Wash',
    kind: 'wash' as const,
    otherKind: null,
    scheduleKind: 'interval' as const,
    everyNDays: 3,
    intervalUnit: 'days' as const,
    productNames: [],
  };

  it('names the products of a wash, or says wash day alone', () => {
    expect(reminderBody(base, t)).toBe('Hair wash day');
    expect(reminderBody({ ...base, productNames: ['Shampoo'] }, t)).toBe('Hair wash day: Shampoo');
  });

  it('says what other care is due and how often', () => {
    const other = { ...base, kind: 'other' as const };
    expect(
      reminderBody({ ...other, otherKind: 'colour', everyNDays: 42, intervalUnit: 'weeks' }, t),
    ).toBe('Time to colour your hair (6 weeks)');
    expect(reminderBody({ ...other, otherKind: 'mask', everyNDays: 10 }, t)).toBe(
      'Time for a hair mask (10 days)',
    );
    expect(
      reminderBody(
        {
          ...other,
          name: 'Scalp scrub',
          otherKind: 'other',
          scheduleKind: 'days',
          everyNDays: null,
        },
        t,
      ),
    ).toBe('Time for Scalp scrub');
  });
});

describe('Done action', () => {
  it('marks the wash done today with its products, in the background, and plans the next one', async () => {
    const shampoo = addProduct('Shampoo');
    const id = saveHairTask(db, input({ productIds: [shampoo] }));
    await sync(NOW);
    const [reminder] = pending();
    expect(reminder).toBeDefined();

    await handleResponse(response('done', reminder!), { background: true, now: NOW });

    const logs = hairLogsOnDay(db, TODAY);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ hairTaskId: id, productIds: [shampoo], note: null });
    expect(getHairTask(db, id, TODAY)?.nextDue).toBe('2026-10-10');
    expect(pending().map((r) => r.fireAt)).toEqual([at(2026, 10, 10, 19)]);
    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith(reminder!.id);
  });

  it('works for other care too, and keeps a log already made today', async () => {
    const id = saveHairTask(db, trim());
    await sync(NOW);
    const [reminder] = pending();
    markHairDone(db, id, { day: TODAY, productIds: [], note: 'Just the ends' });

    await handleResponse(response('done', reminder!), { now: NOW });

    const logs = hairLogsOnDay(db, TODAY);
    expect(logs).toHaveLength(1);
    expect(logs[0]?.note).toBe('Just the ends');
  });

  it('Snooze sends a copy after the snooze length, and Done clears it', async () => {
    const id = saveHairTask(db, input({ lastDoneAt: '2026-10-04' }));
    await sync(NOW);
    const [reminder] = pending();

    await handleResponse(response('snooze', reminder!), { now: NOW });
    const snoozed = os.pending.get(snoozeIdFor(reminder!.data.key));
    expect(snoozed?.fireAt).toBe(NOW + 15 * 60 * 1000);

    await handleResponse(response('done', snoozed!), { now: NOW });
    expect(os.pending.has(snoozeIdFor(reminder!.data.key))).toBe(false);
    expect(getHairTask(db, id, TODAY)?.lastDoneAt).toBe(TODAY);
  });
});

describe('askForHairReminders', () => {
  const granted = {
    status: 'granted',
    granted: true,
    canAskAgain: true,
    expires: 'never',
  } as unknown as Notifications.NotificationPermissionsStatus;

  it('asks while the answer is undetermined, then schedules', async () => {
    saveHairTask(db, input());
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce(granted);
    await askForHairReminders();
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    await sync(NOW); // the ask's own sync ran on the real clock; this pins the time
    expect(pending()).toHaveLength(1);
  });

  it('does not ask again once answered', async () => {
    jest.mocked(Notifications.requestPermissionsAsync).mockClear();
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce(granted);
    await askForHairReminders();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});

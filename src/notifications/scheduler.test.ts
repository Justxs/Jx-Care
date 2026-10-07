import type { Db } from '@/db';
import { setDb } from '@/db';
import { createTestDb } from '@/db/test-db';
import { saveSettings } from '@/features/settings/repo';

import { createFakeOS, type FakeOS } from './fakeOS';
import { insertScheduled, listScheduled } from './repo';
import {
  DAY_MS,
  MAX_SCHEDULED,
  cancelAllNotifications,
  cancelSnoozes,
  diffScheduled,
  notificationKey,
  osIdFor,
  registerPlanner,
  scheduleSnooze,
  selectWindow,
  setNotificationOS,
  snoozeIdFor,
  sync,
  syncEntity,
  unregisterPlanner,
} from './scheduler';
import type { PlannedNotification, PlannerContext } from './types';

const NOW = new Date(2026, 9, 7, 12, 0).getTime();
const HOUR = 60 * 60 * 1000;

function item(
  id: number,
  fireAt: number,
  over: Partial<PlannedNotification> = {},
): PlannedNotification {
  return {
    key: notificationKey('product', id, 'expiry_warning', String(fireAt)),
    entityType: 'product',
    entityId: id,
    kind: 'expiry_warning',
    fireAt,
    title: `Product ${id}`,
    body: `Product ${id} expires in 30 days`,
    categoryId: 'expiry_warning',
    channelId: 'expiry',
    data: { url: `/products/${id}` },
    ...over,
  };
}

/** A scheduled_notification row for the pure diff tests. */
const row = (id: number, notificationId: string, fireAt: number) => ({
  id,
  entityType: 'product' as const,
  entityId: 1,
  kind: 'expiry_warning' as const,
  notificationId,
  fireAt,
  createdAt: 0,
});

let db: Db;
let os: FakeOS;
/** What the test planner returns; tests change it between syncs. */
let planned: PlannedNotification[];

beforeEach(() => {
  db = createTestDb();
  setDb(db);
  saveSettings(db, { language: 'en' });
  os = createFakeOS();
  setNotificationOS(os);
  planned = [];
  registerPlanner('test', () => planned);
});

afterEach(() => {
  unregisterPlanner('test');
  unregisterPlanner('broken');
  setNotificationOS(null);
});

describe('pure helpers', () => {
  it('builds stable keys without #', () => {
    expect(notificationKey('product', 12, 'expiry_warning', '2026-11-05')).toBe(
      'product:12:expiry_warning:2026-11-05',
    );
    expect(notificationKey('digest', null, 'digest', 'a#b')).toBe('digest:-:digest:a_b');
  });

  it('gives a new id when the time or the text changes, the same id otherwise', () => {
    const a = item(1, NOW + HOUR);
    expect(osIdFor({ ...a })).toBe(osIdFor(a));
    expect(osIdFor({ ...a, fireAt: a.fireAt + 1 })).not.toBe(osIdFor(a));
    expect(osIdFor({ ...a, body: 'other' })).not.toBe(osIdFor(a));
    expect(osIdFor(a).startsWith(`${a.key}#`)).toBe(true);
  });

  it('keeps the next 14 days, soonest first, one per key', () => {
    const items = [
      item(1, NOW - 1),
      item(2, NOW),
      item(3, NOW + 14 * DAY_MS),
      item(4, NOW + 14 * DAY_MS + 1),
      item(5, NOW + HOUR),
      item(5, NOW + HOUR, { body: 'duplicate key' }),
    ];
    expect(selectWindow(items, NOW).map((p) => p.entityId)).toEqual([5, 3]);
  });

  it('caps at 60', () => {
    const items = Array.from({ length: 70 }, (_, i) => item(i + 1, NOW + (70 - i) * HOUR));
    const kept = selectWindow(items, NOW);
    expect(kept).toHaveLength(MAX_SCHEDULED);
    expect(kept[0]!.entityId).toBe(70);
    expect(kept.at(-1)!.entityId).toBe(11);
  });

  it('diffs: keeps matches, cancels pending leftovers, drops fired rows', () => {
    const keep = item(1, NOW + HOUR);
    const diff = diffScheduled(
      [keep, item(2, NOW + 2 * HOUR)],
      [
        row(1, osIdFor(keep), keep.fireAt),
        row(2, 'gone#x', NOW + HOUR),
        row(3, 'fired#x', NOW - HOUR),
        row(4, osIdFor(keep), keep.fireAt),
      ],
      NOW,
    );
    expect(diff.cancel.map((r) => r.id)).toEqual([2]);
    expect(diff.drop.map((r) => r.id)).toEqual([3, 4]);
    expect(diff.schedule.map((p) => p.entityId)).toEqual([2]);
  });
});

describe('sync', () => {
  it('schedules new items and records them', async () => {
    planned = [item(1, NOW + HOUR), item(2, NOW + 2 * HOUR)];
    expect(await sync(NOW)).toEqual({ scheduled: 2, cancelled: 0 });
    expect(os.schedule).toHaveBeenCalledTimes(2);
    expect(os.schedule.mock.calls[0]![0]).toMatchObject({
      fireAt: NOW + HOUR,
      title: 'Product 1',
      categoryId: 'expiry_warning',
      channelId: 'expiry',
      data: {
        url: '/products/1',
        entityType: 'product',
        entityId: 1,
        kind: 'expiry_warning',
        channelId: 'expiry',
      },
    });
    expect(listScheduled(db).map((r) => [r.entityId, r.fireAt])).toEqual([
      [1, NOW + HOUR],
      [2, NOW + 2 * HOUR],
    ]);
  });

  it('makes no calls when nothing changed', async () => {
    planned = [item(1, NOW + HOUR), item(2, NOW + 2 * HOUR)];
    await sync(NOW);
    os.resetCalls();
    expect(await sync(NOW)).toEqual({ scheduled: 0, cancelled: 0 });
    expect(os.schedule).not.toHaveBeenCalled();
    expect(os.cancel).not.toHaveBeenCalled();
    expect(os.getAllScheduled).not.toHaveBeenCalled();
  });

  it('cancels and reschedules an item whose time or text changed', async () => {
    const a = item(1, NOW + HOUR);
    const b = item(2, NOW + 2 * HOUR);
    planned = [a, b];
    await sync(NOW);
    os.resetCalls();

    planned = [
      { ...a, fireAt: NOW + 3 * HOUR },
      { ...b, body: 'Product 2 expires in 7 days' },
    ];
    expect(await sync(NOW)).toEqual({ scheduled: 2, cancelled: 2 });
    expect(os.cancel.mock.calls.map((c) => c[0]).sort()).toEqual([osIdFor(a), osIdFor(b)].sort());
    expect([...os.pending.values()].map((r) => [r.fireAt, r.body]).sort()).toEqual([
      [NOW + 2 * HOUR, 'Product 2 expires in 7 days'],
      [NOW + 3 * HOUR, 'Product 1 expires in 30 days'],
    ]);
    expect(listScheduled(db)).toHaveLength(2);
  });

  it('cancels removed items', async () => {
    const a = item(1, NOW + HOUR);
    planned = [a, item(2, NOW + 2 * HOUR)];
    await sync(NOW);
    os.resetCalls();
    planned = [item(2, NOW + 2 * HOUR)];
    await sync(NOW);
    expect(os.cancel).toHaveBeenCalledWith(osIdFor(a));
    expect(os.schedule).not.toHaveBeenCalled();
    expect(listScheduled(db).map((r) => r.entityId)).toEqual([2]);
  });

  it('drops items in the past or beyond 14 days', async () => {
    planned = [item(1, NOW - HOUR), item(2, NOW + 15 * DAY_MS), item(3, NOW + 13 * DAY_MS)];
    await sync(NOW);
    expect([...os.pending.values()].map((r) => r.data.entityId)).toEqual([3]);
  });

  it('keeps the soonest 60 of more', async () => {
    planned = Array.from({ length: 75 }, (_, i) => item(i + 1, NOW + (i + 1) * HOUR));
    await sync(NOW);
    expect(os.schedule).toHaveBeenCalledTimes(60);
    expect(os.pending.size).toBe(60);
    expect(Math.max(...[...os.pending.values()].map((r) => r.data.entityId ?? 0))).toBe(60);
  });

  it('forgets fired notifications without cancelling them', async () => {
    planned = [item(1, NOW + HOUR)];
    await sync(NOW);
    os.resetCalls();
    planned = [];
    await sync(NOW + 2 * HOUR);
    expect(os.cancel).not.toHaveBeenCalled();
    expect(listScheduled(db)).toEqual([]);
  });

  it('without permission cancels everything and schedules nothing', async () => {
    planned = [item(1, NOW + HOUR), item(2, NOW + 2 * HOUR)];
    await sync(NOW);
    os.resetCalls();
    os.permission = 'denied';
    expect(await sync(NOW)).toEqual({ scheduled: 0, cancelled: 2 });
    expect(os.schedule).not.toHaveBeenCalled();
    expect(os.pending.size).toBe(0);
    expect(listScheduled(db)).toEqual([]);

    os.permission = 'undetermined';
    os.resetCalls();
    await sync(NOW);
    expect(os.schedule).not.toHaveBeenCalled();
  });

  it('plans nothing before onboarding has created the settings row', async () => {
    const fresh = createTestDb();
    setDb(fresh);
    planned = [item(1, NOW + HOUR)];
    await sync(NOW);
    expect(os.schedule).not.toHaveBeenCalled();
  });

  it('gives planners the database, time, settings and a translator in the app language', async () => {
    saveSettings(db, { language: 'lt' });
    let ctx: PlannerContext | undefined;
    registerPlanner('test', (c) => {
      ctx = c;
      return [];
    });
    await sync(NOW);
    if (!ctx) throw new Error('planner not called');
    expect(ctx.now).toBe(NOW);
    expect(ctx.db).toBe(db);
    expect(ctx.settings.language).toBe('lt');
    expect(ctx.t('notifications.actions.snooze')).toBe('Atidėti');
  });

  it('skips a planner that throws and schedules the rest', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    registerPlanner('broken', () => {
      throw new Error('boom');
    });
    planned = [item(1, NOW + HOUR)];
    await sync(NOW);
    expect(os.pending.size).toBe(1);
    warn.mockRestore();
  });

  it('runs one sync at a time', async () => {
    planned = [item(1, NOW + HOUR)];
    await Promise.all([sync(NOW), sync(NOW), sync(NOW)]);
    expect(os.schedule).toHaveBeenCalledTimes(1);
    expect(listScheduled(db)).toHaveLength(1);
  });
});

describe('sync with reconcile', () => {
  it('cancels unknown notifications, reschedules lost ones and leaves snoozes alone', async () => {
    const a = item(1, NOW + HOUR);
    const b = item(2, NOW + 2 * HOUR);
    planned = [a, b];
    await sync(NOW);
    // The phone lost b; an old notification and a snoozed copy are pending.
    os.pending.delete(osIdFor(b));
    os.pending.set('product:9:expiry_warning:x#old', {
      ...os.pending.get(osIdFor(a))!,
      id: 'product:9:expiry_warning:x#old',
    });
    os.pending.set(snoozeIdFor('routine:5:routine:x'), {
      ...os.pending.get(osIdFor(a))!,
      id: snoozeIdFor('routine:5:routine:x'),
    });
    os.resetCalls();

    await sync(NOW, { reconcile: true });
    expect(os.cancel).toHaveBeenCalledWith('product:9:expiry_warning:x#old');
    expect(os.schedule).toHaveBeenCalledTimes(1);
    expect([...os.pending.keys()].sort()).toEqual(
      [osIdFor(a), osIdFor(b), snoozeIdFor('routine:5:routine:x')].sort(),
    );
    expect(listScheduled(db)).toHaveLength(2);
  });
});

describe('syncEntity', () => {
  it('touches only that entity', async () => {
    const a = item(1, NOW + HOUR);
    const b = item(2, NOW + 2 * HOUR);
    planned = [a, b];
    await sync(NOW);
    os.resetCalls();

    // Both changed, but only product 1 is synced.
    planned = [
      { ...a, title: 'Renamed' },
      { ...b, title: 'Renamed too' },
    ];
    expect(await syncEntity('product', 1, NOW)).toEqual({ scheduled: 1, cancelled: 1 });
    expect(os.cancel).toHaveBeenCalledWith(osIdFor(a));
    expect(os.schedule.mock.calls.map((c) => c[0].data.entityId)).toEqual([1]);
    expect(os.pending.has(osIdFor(b))).toBe(true);
  });

  it('removes an entity whose items are gone', async () => {
    planned = [item(1, NOW + HOUR), item(2, NOW + 2 * HOUR)];
    await sync(NOW);
    planned = [item(2, NOW + 2 * HOUR)];
    await syncEntity('product', 1, NOW);
    expect(listScheduled(db).map((r) => r.entityId)).toEqual([2]);
  });

  it('falls back to a full sync when the phone would go over 60', async () => {
    const others = Array.from({ length: 60 }, (_, i) => item(i + 10, NOW + (i + 2) * HOUR));
    planned = others;
    await sync(NOW);
    planned = [...others, item(1, NOW + HOUR)];
    await syncEntity('product', 1, NOW);
    expect(os.pending.size).toBe(60);
    expect(listScheduled(db)).toHaveLength(60);
    expect(listScheduled(db)[0]!.entityId).toBe(1);
  });

  it('handles entities without an id (digest)', async () => {
    const digest = item(0, NOW + HOUR, {
      key: notificationKey('digest', null, 'digest', '2026-10-12'),
      entityType: 'digest',
      entityId: null,
      kind: 'digest',
      channelId: 'digest',
      categoryId: undefined,
    });
    planned = [digest, item(2, NOW + 2 * HOUR)];
    await syncEntity('digest', null, NOW);
    expect(listScheduled(db).map((r) => r.entityType)).toEqual(['digest']);
  });

  it('without permission cancels only that entity', async () => {
    planned = [item(1, NOW + HOUR), item(2, NOW + 2 * HOUR)];
    await sync(NOW);
    os.permission = 'denied';
    await syncEntity('product', 1, NOW);
    expect(listScheduled(db).map((r) => r.entityId)).toEqual([2]);
  });
});

describe('snooze and cancel all', () => {
  const source = {
    data: {
      url: '/player/5',
      key: 'routine:5:routine:2026-10-07',
      entityType: 'routine' as const,
      entityId: 5,
      kind: 'routine' as const,
      channelId: 'routines' as const,
    },
    title: 'Evening routine',
    body: 'Evening routine: 5 steps',
    categoryId: 'routine' as const,
    channelId: 'routines' as const,
  };

  it('schedules a one-off copy that sync leaves alone, and cancels it for its entity', async () => {
    await scheduleSnooze(source, 15, NOW);
    expect(os.pending.get(snoozeIdFor(source.data.key))).toMatchObject({
      fireAt: NOW + 15 * 60 * 1000,
      body: 'Evening routine: 5 steps',
      categoryId: 'routine',
    });
    await sync(NOW, { reconcile: true });
    expect(os.pending.size).toBe(1);

    expect(await cancelSnoozes('routine', 6)).toBe(0);
    expect(await cancelSnoozes('routine', 5)).toBe(1);
    expect(os.pending.size).toBe(0);
  });

  it('cancels everything and empties the table', async () => {
    planned = [item(1, NOW + HOUR)];
    await sync(NOW);
    await scheduleSnooze(source, 5, NOW);
    await cancelAllNotifications();
    expect(os.pending.size).toBe(0);
    expect(listScheduled(db)).toEqual([]);
  });

  it('records rows the repo can list per entity', () => {
    insertScheduled(db, {
      entityType: 'routine',
      entityId: 5,
      kind: 'routine',
      notificationId: 'x#1',
      fireAt: NOW,
    });
    expect(listScheduled(db, { entityType: 'routine', entityId: 5 })).toHaveLength(1);
    expect(listScheduled(db, { entityType: 'routine', entityId: 6 })).toHaveLength(0);
  });
});

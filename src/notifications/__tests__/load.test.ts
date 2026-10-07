// Every feature's planners, the way the app registers them.
import '../tasks';

import { eq } from 'drizzle-orm';

import { setDb, type Db } from '@/db';
import { queryClient } from '@/db/queryClient';
import { routine } from '@/db/schema';
import { createTestDb } from '@/db/test-db';
import { saveHairTask } from '@/features/hair/repo';
import { saveSettings } from '@/features/settings/repo';
import { seedProduct, seedRoutine } from '@/features/today/testUtils';
import { i18n } from '@/i18n';

import { createFakeOS, type FakeOS } from '../fakeOS';
import {
  MAX_SCHEDULED,
  isSnoozeId,
  scheduleSnooze,
  setNotificationOS,
  snoozeIdFor,
  sync,
} from '../scheduler';

// Wednesday 7 Oct 2026, noon.
const NOW = new Date(2026, 9, 7, 12, 0).getTime();

let db: Db;
let os: FakeOS;

beforeEach(async () => {
  db = createTestDb();
  setDb(db);
  saveSettings(db, {
    language: 'en',
    expiryRemindersOn: true,
    weeklyPhotoOn: true,
    weeklyDigestOn: true,
  });
  os = createFakeOS();
  setNotificationOS(os);
  await i18n.changeLanguage('en');
});

afterEach(() => setNotificationOS(null));
afterAll(() => queryClient.clear());

/** A very full phone: 80 products expiring over the next weeks, four routines, three hair tasks. */
function seedBusyPhone(): void {
  for (let i = 0; i < 80; i++) {
    // Two a day between 8 Oct and 16 Nov: far more than 60 reminders in the 14-day window.
    const expires = new Date(2026, 9, 8 + (i % 40));
    const day = `${expires.getFullYear()}-${String(expires.getMonth() + 1).padStart(2, '0')}-${String(expires.getDate()).padStart(2, '0')}`;
    seedProduct(db, { name: `Product ${i}`, expiresAt: day });
  }
  for (const [name, timeOfDay, time] of [
    ['Morning', 'morning', '07:30'],
    ['Evening A', 'evening', '21:00'],
    ['Evening B', 'evening', '21:00'],
    ['Midday SPF', 'morning', '07:45'],
  ] as const) {
    const id = seedRoutine(db, { name, timeOfDay, reminderTime: time });
    db.update(routine)
      .set({ createdAt: new Date(2026, 0, 1).getTime() })
      .where(eq(routine.id, id))
      .run();
  }
  for (const [name, every] of [
    ['Wash', 2],
    ['Hair mask', 7],
    ['Scalp scrub', 5],
  ] as const) {
    saveHairTask(db, {
      name,
      kind: name === 'Wash' ? 'wash' : 'other',
      otherKind: name === 'Wash' ? null : 'mask',
      productIds: [],
      scheduleKind: 'interval',
      everyNDays: every,
      intervalUnit: 'days',
      daysOfWeek: null,
      lastDoneAt: '2026-10-06',
      reminderTime: '19:00',
    });
  }
}

describe('notifications under load (task 041)', () => {
  it('keeps at most 60 pending, soonest first, and a second sync changes nothing', async () => {
    seedBusyPhone();
    await sync(NOW);
    const pending = [...os.pending.values()];
    expect(pending.length).toBe(MAX_SCHEDULED);
    expect(Math.min(...pending.map((p) => p.fireAt))).toBeGreaterThan(NOW);

    os.resetCalls();
    await sync(NOW);
    expect(os.pending.size).toBe(MAX_SCHEDULED);
    expect(os.schedule).not.toHaveBeenCalled();
    expect(os.cancel).not.toHaveBeenCalled();
  });

  it('keeps planned plus snoozed at most 60, and the snoozes survive a re-plan', async () => {
    seedBusyPhone();
    await sync(NOW);
    const delivered = [...os.pending.values()].slice(0, 10);
    for (const n of delivered) {
      await scheduleSnooze(
        {
          data: n.data,
          title: n.title,
          body: n.body,
          categoryId: n.categoryId,
          channelId: n.channelId,
        },
        15,
        NOW,
      );
    }
    const snoozed = [...os.pending.keys()].filter(isSnoozeId);
    expect(snoozed).toHaveLength(10);
    expect(os.pending.size).toBe(MAX_SCHEDULED);

    await sync(NOW, { reconcile: true });
    expect(os.pending.size).toBe(MAX_SCHEDULED);
    for (const n of delivered) expect(os.pending.has(snoozeIdFor(n.data.key))).toBe(true);
  });

  it('tops up as time passes', async () => {
    seedBusyPhone();
    await sync(NOW);
    const later = NOW + 3 * 24 * 60 * 60 * 1000;
    // The phone drops what it has delivered in the meantime.
    for (const [id, r] of os.pending) if (r.fireAt <= later) os.pending.delete(id);
    await sync(later);
    const pending = [...os.pending.values()];
    expect(pending.length).toBe(MAX_SCHEDULED);
    expect(pending.every((p) => p.fireAt > later)).toBe(true);
  });
});

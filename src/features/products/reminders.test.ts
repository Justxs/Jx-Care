import * as Notifications from 'expo-notifications';

import { setDb, type Db } from '@/db';
import { createTestDb } from '@/db/test-db';
import { listShopping } from '@/features/shopping/repo';
import { getSettings, saveSettings, type SettingsPatch } from '@/features/settings/repo';
import { i18n, setI18nLanguage } from '@/i18n';
import { momentOf } from '@/lib/appDay';
import { createFakeOS, type FakeOS } from '@/notifications/fakeOS';
import { handleResponse } from '@/notifications/responses';
import { setNotificationOS, sync } from '@/notifications/scheduler';
import type { PlannerContext } from '@/notifications/types';

import { digestText, planDigest, planExpiry } from './reminders';
import { createProduct, getProduct, markFinished } from './repo';
import type { ProductInput } from './schema';

jest.mock('@/db/queryClient', () => {
  const actual = jest.requireActual('@/db/queryClient');
  return { ...actual, queryClient: actual.createQueryClient({ gcTime: Infinity }) };
});

/** Wednesday 7 Oct 2026, 12:00. */
const NOW = new Date(2026, 9, 7, 12, 0).getTime();

const input = (over: Partial<ProductInput> = {}): ProductInput => ({
  name: 'Vitamin C serum',
  brand: null,
  area: 'skin',
  category: 'serum',
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

let db: Db;

beforeEach(async () => {
  await setI18nLanguage('en');
  db = createTestDb();
  setDb(db);
  saveSettings(db, { language: 'en', expiryRemindersOn: true });
});

function ctx(patch: SettingsPatch = {}, now = NOW): PlannerContext {
  const settings = { ...getSettings(db), ...patch };
  return { db, now, settings, t: i18n.getFixedT(settings.language) };
}

describe('planExpiry', () => {
  it('plans a warning and an expiry-day reminder at the reminder time', () => {
    const id = createProduct(db, input({ expiresAt: '2026-11-20' }));
    const items = planExpiry(ctx());
    expect(items).toEqual([
      {
        key: `product:${id}:expiry_warning:2026-10-21`,
        entityType: 'product',
        entityId: id,
        kind: 'expiry_warning',
        fireAt: momentOf('2026-10-21', '09:00'),
        title: 'Vitamin C serum expires in 30 days',
        body: '',
        categoryId: 'expiry_warning',
        channelId: 'expiry',
        data: { url: `/products/${id}` },
      },
      {
        key: `product:${id}:expiry_day:2026-11-20`,
        entityType: 'product',
        entityId: id,
        kind: 'expiry_day',
        fireAt: momentOf('2026-11-20', '09:00'),
        title: 'Vitamin C serum expires today',
        body: '',
        categoryId: 'expiry_day',
        channelId: 'expiry',
        data: { url: `/products/${id}` },
      },
    ]);
  });

  it('uses the effective expiry (opened + period after opening when sooner)', () => {
    createProduct(db, input({ expiresAt: '2027-06-01', openedAt: '2026-09-15', paoMonths: 3 }));
    const [warning, day] = planExpiry(ctx());
    expect(day?.key).toMatch(/expiry_day:2026-12-15$/);
    expect(warning?.key).toMatch(/expiry_warning:2026-11-15$/);
  });

  it('moves the warning with the warning window and the time with the setting', () => {
    createProduct(db, input({ expiresAt: '2026-11-20' }));
    const [warning, day] = planExpiry(ctx({ expiryWarnDays: 7, expiryReminderTime: '20:30' }));
    expect(warning?.fireAt).toBe(momentOf('2026-11-13', '20:30'));
    expect(warning?.title).toBe('Vitamin C serum expires in 7 days');
    expect(day?.fireAt).toBe(momentOf('2026-11-20', '20:30'));
  });

  it('skips days already past', () => {
    // Warning day 20 Sep has passed; the expiry day is still ahead.
    createProduct(db, input({ expiresAt: '2026-10-20' }));
    expect(planExpiry(ctx()).map((p) => p.kind)).toEqual(['expiry_day']);
    // Today at 09:00 has passed at 12:00.
    createProduct(db, input({ name: 'Toner', expiresAt: '2026-10-07' }));
    expect(planExpiry(ctx()).filter((p) => p.title.startsWith('Toner'))).toEqual([]);
  });

  it('leaves out the expiry day when it is switched off', () => {
    createProduct(db, input({ expiresAt: '2026-11-20' }));
    expect(planExpiry(ctx({ expiryDayReminderOn: false })).map((p) => p.kind)).toEqual([
      'expiry_warning',
    ]);
  });

  it('plans nothing for products with no date, archived products or with reminders off', () => {
    createProduct(db, input({ name: 'No date' }));
    createProduct(db, input({ name: 'Opened, no period', openedAt: '2026-09-01' }));
    const archived = createProduct(db, input({ name: 'Finished', expiresAt: '2026-11-20' }));
    markFinished(db, archived, '2026-10-01');
    expect(planExpiry(ctx())).toEqual([]);

    createProduct(db, input({ expiresAt: '2026-11-20' }));
    expect(planExpiry(ctx())).toHaveLength(2);
    expect(planExpiry(ctx({ expiryRemindersOn: false }))).toEqual([]);
  });

  it('writes the text in the app language', () => {
    createProduct(db, input({ expiresAt: '2026-11-20' }));
    const [warning, day] = planExpiry(ctx({ language: 'lt' }));
    expect(warning?.title).toBe('Vitamin C serum baigs galioti po 30 dienų');
    expect(day?.title).toBe('Vitamin C serum galioja paskutinę dieną');
  });
});

describe('planDigest', () => {
  beforeEach(() => {
    createProduct(db, input({ name: 'Expiring', expiresAt: '2026-10-20' }));
    createProduct(db, input({ name: 'Expired A', expiresAt: '2026-10-01' }));
    createProduct(db, input({ name: 'Expired B', expiresAt: '2026-09-01' }));
    createProduct(db, input({ name: 'Unopened', expiresAt: '2027-06-01' }));
    createProduct(db, input({ name: 'Fine', expiresAt: '2027-06-01', openedAt: '2026-10-01' }));
    createProduct(db, input({ name: 'No date' }));
  });

  it('plans every Monday at 09:00 in the window with the counts', () => {
    const items = planDigest(ctx());
    expect(items.map((p) => p.fireAt)).toEqual([
      momentOf('2026-10-12', '09:00'),
      momentOf('2026-10-19', '09:00'),
    ]);
    expect(items[0]).toMatchObject({
      key: 'digest:-:digest:2026-10-12',
      entityType: 'digest',
      entityId: null,
      kind: 'digest',
      title: '1 expiring soon, 2 expired, 1 unopened',
      channelId: 'digest',
      data: { url: '/products?filter=expiring' },
    });
    expect(items[0]?.categoryId).toBeUndefined();
  });

  it('counts with the warning window', () => {
    // With 7 days, "Expiring" (13 days left, never opened) counts as unopened instead.
    expect(planDigest(ctx({ expiryWarnDays: 7 }))[0]?.title).toBe('2 expired, 2 unopened');
  });

  it('does not plan this Monday once 09:00 has passed', () => {
    const monday = new Date(2026, 9, 12, 9, 30).getTime();
    expect(planDigest(ctx({}, monday)).map((p) => p.key)).toEqual([
      'digest:-:digest:2026-10-19',
      'digest:-:digest:2026-10-26',
    ]);
  });

  it('plans nothing when it is off or every count is 0', () => {
    expect(planDigest(ctx({ weeklyDigestOn: false }))).toEqual([]);
    const fresh = createTestDb();
    setDb(fresh);
    db = fresh;
    saveSettings(db, { language: 'en' });
    createProduct(db, input({ name: 'Fine', expiresAt: '2027-06-01', openedAt: '2026-10-01' }));
    expect(planDigest(ctx())).toEqual([]);
  });

  it('writes Lithuanian plurals and leaves out zero counts', () => {
    const t = i18n.getFixedT('lt');
    expect(digestText({ expiring: 2, expired: 0, unopened: 21 }, t)).toBe(
      '2 netrukus baigs galioti, 21 neatidarytas',
    );
    expect(digestText({ expiring: 0, expired: 5, unopened: 3 }, t)).toBe(
      '5 nebegalioja, 3 neatidaryti',
    );
    expect(digestText({ expiring: 0, expired: 0, unopened: 10 }, t)).toBe('10 neatidarytų');
  });
});

describe('scheduling', () => {
  let os: FakeOS;

  beforeEach(() => {
    os = createFakeOS();
    setNotificationOS(os);
  });

  afterEach(() => setNotificationOS(null));

  it('keeps the next 14 days of expiry and digest reminders on the phone', async () => {
    createProduct(db, input({ expiresAt: '2026-10-15' }));
    createProduct(db, input({ name: 'Far', expiresAt: '2027-06-01', openedAt: '2026-10-01' }));
    await sync(NOW);
    const titles = [...os.pending.values()].map((r) => r.title).sort();
    expect(titles).toEqual(['1 expiring soon', '1 expiring soon', 'Vitamin C serum expires today']);
  });
});

describe('action buttons', () => {
  let os: FakeOS;
  let counter = 0;

  beforeEach(() => {
    os = createFakeOS();
    setNotificationOS(os);
  });

  afterEach(() => setNotificationOS(null));

  function press(action: string, category: string, productId: number) {
    counter++;
    const kind = category;
    return handleResponse(
      {
        actionIdentifier: action,
        notification: {
          date: NOW + counter,
          request: {
            identifier: `product:${productId}:${kind}:x#1`,
            content: {
              title: 'Vitamin C serum expires today',
              body: '',
              data: {
                url: `/products/${productId}`,
                key: `product:${productId}:${kind}:x`,
                entityType: 'product',
                entityId: productId,
                kind,
                channelId: 'expiry',
              },
              categoryIdentifier: category,
            },
            trigger: null,
          },
        },
      } as unknown as Notifications.NotificationResponse,
      { now: NOW },
    );
  }

  it('Mark finished archives the product and drops its reminders', async () => {
    const id = createProduct(db, input({ expiresAt: '2026-10-15' }));
    await sync(NOW);
    expect(os.pending.size).toBeGreaterThan(0);
    await press('mark_finished', 'expiry_day', id);
    expect(getProduct(db, id, '2026-10-07', 30)?.archivedAt).toBe('2026-10-07');
    expect([...os.pending.values()].filter((r) => r.data.entityType === 'product')).toEqual([]);
    expect(Notifications.dismissNotificationAsync).toHaveBeenCalled();
  });

  it('Mark finished leaves an already finished product alone', async () => {
    const id = createProduct(db, input({ expiresAt: '2026-10-15' }));
    markFinished(db, id, '2026-10-01');
    await press('mark_finished', 'expiry_day', id);
    expect(getProduct(db, id, '2026-10-07', 30)?.archivedAt).toBe('2026-10-01');
  });

  it('Buy again adds the product to the shopping list', async () => {
    const id = createProduct(db, input({ expiresAt: '2026-11-20' }));
    await press('buy_again', 'expiry_warning', id);
    const toBuy = listShopping(db).toBuy;
    expect(toBuy.map((i) => i.productId)).toEqual([id]);
  });
});

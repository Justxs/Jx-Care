import { Linking } from 'react-native';

import { setDb, type Db } from '@/db';
import { createQueryClient } from '@/db/queryClient';
import { qk } from '@/db/queryKeys';
import { createTestDb } from '@/db/test-db';
import { getSettings, saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { dismissToast, runToastAction, uiStore } from '@/state/ui';

import {
  answerReminderAsk,
  askForReminders,
  reminderAskStore,
  resetReminderAsk,
  setPermissionAdapter,
  type PermissionAdapter,
} from './askPermission';
import { createFakeOS, type FakeOS } from './fakeOS';
import {
  notificationKey,
  registerPlanner,
  setNotificationOS,
  unregisterPlanner,
} from './scheduler';
import type { PermissionState } from './types';

jest.mock('@/db/queryClient', () => {
  const actual = jest.requireActual('@/db/queryClient');
  return { ...actual, queryClient: actual.createQueryClient({ gcTime: Infinity }) };
});

/** The phone's permission prompt, with the answer the test chooses. */
function fakePermission(initial: PermissionState, answer: PermissionState) {
  let state = initial;
  return {
    get: jest.fn(async (): Promise<PermissionState> => state),
    request: jest.fn(async (): Promise<PermissionState> => {
      state = answer;
      return answer;
    }),
  } satisfies PermissionAdapter;
}

let db: Db;
let os: FakeOS;
const client = createQueryClient({ gcTime: Infinity });

beforeEach(async () => {
  await setI18nLanguage('en');
  db = createTestDb();
  setDb(db);
  saveSettings(db, { language: 'en' });
  os = createFakeOS();
  setNotificationOS(os);
  // Schedules one reminder while expiry reminders are on.
  registerPlanner('test', ({ settings, now }) =>
    settings.expiryRemindersOn
      ? [
          {
            key: notificationKey('product', 1, 'expiry_warning', 'x'),
            entityType: 'product',
            entityId: 1,
            kind: 'expiry_warning',
            fireAt: now + 60_000,
            title: 'Vitamin C serum expires in 30 days',
            body: '',
            channelId: 'expiry',
            data: { url: '/products/1' },
          },
        ]
      : [],
  );
});

afterEach(() => {
  resetReminderAsk();
  unregisterPlanner('test');
  setNotificationOS(null);
  setPermissionAdapter(null);
  for (const t of uiStore.state.toasts) dismissToast(t.id);
});

function openExpiryAsk() {
  return askForReminders({ reason: 'expiry', productName: 'Vitamin C serum' }, { client });
}

describe('the expiry ask (P3)', () => {
  it('shows the sheet with the product', async () => {
    setPermissionAdapter(fakePermission('undetermined', 'granted'));
    void openExpiryAsk();
    await Promise.resolve();
    expect(reminderAskStore.state.ask).toMatchObject({
      reason: 'expiry',
      productName: 'Vitamin C serum',
    });
  });

  it('Allow with permission granted turns expiry reminders on and schedules them', async () => {
    const permission = fakePermission('undetermined', 'granted');
    setPermissionAdapter(permission);
    os.permission = 'undetermined';
    const result = openExpiryAsk();
    await Promise.resolve();
    // The system prompt only shows after Allow.
    expect(permission.request).not.toHaveBeenCalled();
    os.permission = 'granted';
    await answerReminderAsk('allow', client);
    await expect(result).resolves.toBe('granted');

    expect(permission.request).toHaveBeenCalledTimes(1);
    expect(getSettings(db)).toMatchObject({ expiryRemindersOn: true, reminderAskDone: true });
    expect(client.getQueryData(qk.settings)).toMatchObject({ expiryRemindersOn: true });
    expect(client.getQueryData(qk.notifications.permission)).toBe('granted');
    expect([...os.pending.values()].map((r) => r.title)).toEqual([
      'Vitamin C serum expires in 30 days',
    ]);
    expect(reminderAskStore.state.ask).toBeNull();
  });

  it('Allow with permission denied leaves reminders off and points to phone settings', async () => {
    setPermissionAdapter(fakePermission('undetermined', 'denied'));
    const result = openExpiryAsk();
    await Promise.resolve();
    await answerReminderAsk('allow', client);
    await expect(result).resolves.toBe('denied');

    expect(getSettings(db)).toMatchObject({ expiryRemindersOn: false, reminderAskDone: true });
    const [toast] = uiStore.state.toasts;
    expect(toast).toMatchObject({
      message: 'Notifications are off in phone settings',
      actionLabel: 'Open settings',
    });
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValueOnce(undefined);
    runToastAction(toast!.id);
    expect(openSettings).toHaveBeenCalled();
    expect(os.schedule).not.toHaveBeenCalled();
  });

  it('Not now leaves reminders off and is never asked again from a product', async () => {
    const permission = fakePermission('undetermined', 'granted');
    setPermissionAdapter(permission);
    const result = openExpiryAsk();
    await Promise.resolve();
    await answerReminderAsk('notNow', client);
    await expect(result).resolves.toBe('notNow');

    expect(permission.request).not.toHaveBeenCalled();
    expect(getSettings(db)).toMatchObject({ expiryRemindersOn: false, reminderAskDone: true });
    // Closing the sheet afterwards answers nothing.
    await expect(answerReminderAsk('notNow', client)).resolves.toBeNull();
  });

  it('asks even when permission is already granted, since expiry reminders start off', async () => {
    const permission = fakePermission('granted', 'granted');
    setPermissionAdapter(permission);
    const result = openExpiryAsk();
    await Promise.resolve();
    expect(reminderAskStore.state.ask?.reason).toBe('expiry');
    await answerReminderAsk('allow', client);
    await expect(result).resolves.toBe('granted');
    expect(getSettings(db).expiryRemindersOn).toBe(true);
  });

  it('shows one ask at a time', async () => {
    setPermissionAdapter(fakePermission('undetermined', 'granted'));
    void openExpiryAsk();
    await Promise.resolve();
    await expect(askForReminders({ reason: 'routine' }, { client })).resolves.toBe('notNow');
  });
});

describe('asks from other features (routines, hair, weekly photo)', () => {
  it('needs no ask when permission is granted', async () => {
    const permission = fakePermission('granted', 'granted');
    setPermissionAdapter(permission);
    await expect(askForReminders({ reason: 'routine' }, { client })).resolves.toBe('granted');
    expect(reminderAskStore.state.ask).toBeNull();
    expect(permission.request).not.toHaveBeenCalled();
  });

  it('shows the toast when permission is off in phone settings', async () => {
    setPermissionAdapter(fakePermission('denied', 'denied'));
    await expect(askForReminders({ reason: 'hair' }, { client })).resolves.toBe('denied');
    expect(uiStore.state.toasts[0]?.message).toBe('Notifications are off in phone settings');
    expect(reminderAskStore.state.ask).toBeNull();
  });

  it('shows the sheet when undetermined; Allow asks the phone and syncs', async () => {
    const permission = fakePermission('undetermined', 'granted');
    setPermissionAdapter(permission);
    saveSettings(db, { expiryRemindersOn: true });
    const result = askForReminders({ reason: 'routine' }, { client });
    await Promise.resolve();
    await Promise.resolve();
    expect(reminderAskStore.state.ask?.reason).toBe('routine');
    await answerReminderAsk('allow', client);
    await expect(result).resolves.toBe('granted');
    expect(os.pending.size).toBe(1);
    // Only the expiry ask touches reminderAskDone.
    expect(getSettings(db).reminderAskDone).toBe(false);
  });

  it('Not now changes nothing', async () => {
    setPermissionAdapter(fakePermission('undetermined', 'granted'));
    const result = askForReminders({ reason: 'weeklyPhoto' }, { client });
    await Promise.resolve();
    await Promise.resolve();
    await answerReminderAsk('notNow', client);
    await expect(result).resolves.toBe('notNow');
    expect(getSettings(db).reminderAskDone).toBe(false);
  });

  it('from the Reminders screen goes straight to the system prompt', async () => {
    const permission = fakePermission('undetermined', 'granted');
    setPermissionAdapter(permission);
    await expect(askForReminders({ reason: 'settings' }, { client })).resolves.toBe('granted');
    expect(permission.request).toHaveBeenCalledTimes(1);
    expect(reminderAskStore.state.ask).toBeNull();
  });
});

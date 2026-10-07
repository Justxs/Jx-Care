import { waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

import { qk } from '@/db/queryKeys';
import { getSettings, saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { appStore } from '@/state/app';
import { setLocked } from '@/state/lock';
import { setupTestApp } from '@/test/render';

import { createFakeOS, type FakeOS } from './fakeOS';
import {
  notificationKey,
  registerPlanner,
  setNotificationOS,
  unregisterPlanner,
} from './scheduler';
import { startNotifications } from './start';
import type { Planner } from './types';

const HOUR = 60 * 60 * 1000;

/** One reminder an hour from now while expiry reminders are on, its text in the app language. */
const planner: Planner = ({ now, settings, t }) =>
  settings.expiryRemindersOn
    ? [
        {
          key: notificationKey('product', 1, 'expiry_day', 'x'),
          entityType: 'product',
          entityId: 1,
          kind: 'expiry_day',
          fireAt: Math.ceil((now + HOUR) / HOUR) * HOUR,
          title: t('notifications.channels.expiry'),
          body: 'Serum',
          channelId: 'expiry',
          categoryId: 'expiry_day',
          data: { url: '/products/1' },
        },
      ]
    : [];

let os: FakeOS;
let onAppState: ((state: string) => void) | undefined;
let app: ReturnType<typeof setupTestApp>;
let stop: () => void;

beforeEach(async () => {
  await setI18nLanguage('en');
  appStore.setState((s) => ({ ...s, language: 'en' }));
  app = setupTestApp();
  saveSettings(app.db, { language: 'en', expiryRemindersOn: true });
  app.client.setQueryData(qk.settings, getSettings(app.db));
  os = createFakeOS();
  setNotificationOS(os);
  registerPlanner('start-test', planner);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, fn) => {
    onAppState = fn as (state: string) => void;
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
  stop = startNotifications({ queryClient: app.client });
  await waitFor(() => {
    if (os.pending.size !== 1) throw new Error('first sync still running');
  });
  os.resetCalls();
});

afterEach(() => {
  stop();
  unregisterPlanner('start-test');
  setNotificationOS(null);
  setLocked(true);
  jest.restoreAllMocks();
});

const titles = () => [...os.pending.values()].map((r) => r.title);

it('syncs on start, comparing with the phone, and sets up channels and buttons', () => {
  expect(titles()).toEqual(['Expiry']);
  expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalled();
  expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled();
});

it('re-registers names and re-plans the text when the language changes', async () => {
  jest.mocked(Notifications.setNotificationCategoryAsync).mockClear();
  saveSettings(app.db, { language: 'lt' });
  appStore.setState((s) => ({ ...s, language: 'lt' }));
  await waitFor(() => expect(titles()).toEqual(['Galiojimas']));
  expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith('routine', [
    expect.objectContaining({ buttonTitle: 'Atidėti' }),
  ]);
});

it('syncs when reminder settings change', async () => {
  const next = saveSettings(app.db, { expiryRemindersOn: false });
  app.client.setQueryData(qk.settings, next);
  await waitFor(() => expect(os.pending.size).toBe(0));
});

it('ignores settings that do not change reminders', async () => {
  const next = saveSettings(app.db, { currency: 'USD' });
  app.client.setQueryData(qk.settings, next);
  await new Promise((r) => setTimeout(r, 10));
  expect(os.getPermission).not.toHaveBeenCalled();
});

it('syncs on a new app day and after unlock', async () => {
  appStore.setState((s) => ({ ...s, activeDay: '2099-01-01' }));
  await waitFor(() => expect(os.getAllScheduled).toHaveBeenCalled());
  os.resetCalls();
  setLocked(true);
  setLocked(false);
  await waitFor(() => expect(os.getPermission).toHaveBeenCalled());
});

it('syncs when permission changed in phone settings while away', async () => {
  os.permission = 'denied';
  onAppState?.('active');
  await waitFor(() => expect(os.pending.size).toBe(0));
  expect(app.client.getQueryData(qk.notifications.permission)).toBe('denied');
});

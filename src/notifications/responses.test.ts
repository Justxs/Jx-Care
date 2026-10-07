import * as Notifications from 'expo-notifications';

import { setDb } from '@/db';
import { createTestDb } from '@/db/test-db';
import { saveSettings } from '@/features/settings/repo';
import { lockStore, setLocked, setPendingUrl } from '@/state/lock';

import { createFakeOS, type FakeOS } from './fakeOS';
import {
  handleResponse,
  openPendingUrl,
  readData,
  registerAction,
  resetHandledResponses,
  setNavigator,
  startResponseHandling,
  unregisterAction,
} from './responses';
import { setNotificationOS, snoozeIdFor } from './scheduler';

const TAP = Notifications.DEFAULT_ACTION_IDENTIFIER;
const NOW = new Date(2026, 9, 7, 20, 0).getTime();

const data = {
  url: '/player/5',
  key: 'routine:5:routine:2026-10-07',
  entityType: 'routine',
  entityId: 5,
  kind: 'routine',
  channelId: 'routines',
};

let counter = 0;
function response(
  actionIdentifier: string,
  over: { categoryIdentifier?: string | null; data?: Record<string, unknown> } = {},
): Notifications.NotificationResponse {
  counter++;
  return {
    actionIdentifier,
    notification: {
      date: NOW + counter,
      request: {
        identifier: `${data.key}#abc`,
        content: {
          title: 'Evening routine',
          subtitle: null,
          body: 'Evening routine: 5 steps',
          data: over.data ?? data,
          categoryIdentifier: over.categoryIdentifier ?? 'routine',
          sound: 'default',
        },
        trigger: null,
      },
    },
  } as unknown as Notifications.NotificationResponse;
}

let navigate: jest.Mock;
let os: FakeOS;

beforeEach(() => {
  const db = createTestDb();
  setDb(db);
  saveSettings(db, { language: 'en', snoozeMinutes: 30 });
  os = createFakeOS();
  setNotificationOS(os);
  navigate = jest.fn();
  setNavigator(navigate);
  setPendingUrl(null);
  resetHandledResponses();
  jest.mocked(Notifications.dismissNotificationAsync).mockClear();
});

afterEach(() => {
  setNotificationOS(null);
  setLocked(true);
});

describe('taps', () => {
  it('opens the screen at once when unlocked', async () => {
    setLocked(false);
    await handleResponse(response(TAP));
    expect(navigate).toHaveBeenCalledWith('/player/5');
    expect(lockStore.state.pendingUrl).toBeNull();
  });

  it('waits for the PIN when locked, then opens the screen once', async () => {
    setLocked(true);
    await handleResponse(response(TAP, { data: { ...data, url: '/products/12' } }));
    expect(navigate).not.toHaveBeenCalled();
    expect(lockStore.state.pendingUrl).toBe('/products/12');

    setLocked(false);
    expect(openPendingUrl()).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/products/12');
    expect(lockStore.state.pendingUrl).toBeNull();
    expect(openPendingUrl()).toBe(false);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('handles the same response only once', async () => {
    setLocked(false);
    const r = response(TAP);
    await handleResponse(r);
    await handleResponse(r);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('leaves taps to the app in the background task', async () => {
    setLocked(false);
    const r = response(TAP);
    await handleResponse(r, { background: true });
    expect(navigate).not.toHaveBeenCalled();
    await handleResponse(r);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('ignores notifications without our data', async () => {
    setLocked(false);
    await handleResponse(response(TAP, { data: { url: 'https://example.com' } }));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('handles the tap that cold-started the app', async () => {
    setLocked(true);
    jest
      .mocked(Notifications.getLastNotificationResponseAsync)
      .mockResolvedValueOnce(response(TAP, { data: { ...data, url: '/progress/camera' } }));
    const stop = startResponseHandling();
    await new Promise((r) => setTimeout(r, 0));
    expect(lockStore.state.pendingUrl).toBe('/progress/camera');
    expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalled();
    stop();
  });

  it('listens for taps while running', async () => {
    setLocked(false);
    const stop = startResponseHandling();
    const listener = jest
      .mocked(Notifications.addNotificationResponseReceivedListener)
      .mock.calls.at(-1)![0];
    listener(response(TAP, { data: { ...data, url: '/hair/done/3' } }));
    await new Promise((r) => setTimeout(r, 0));
    expect(navigate).toHaveBeenCalledWith('/hair/done/3');
    stop();
  });
});

describe('action buttons', () => {
  it('runs the registered handler with the notification and settings, then dismisses it', async () => {
    const handler = jest.fn();
    registerAction('expiry_day', 'mark_finished', handler);
    const productData = {
      ...data,
      url: '/products/12',
      key: 'product:12:expiry_day:2026-10-07',
      entityType: 'product',
      entityId: 12,
      kind: 'expiry_day',
      channelId: 'expiry',
    };
    await handleResponse(
      response('mark_finished', { categoryIdentifier: 'expiry_day', data: productData }),
      { now: NOW },
    );
    expect(handler).toHaveBeenCalledTimes(1);
    const ctx = handler.mock.calls[0][0];
    expect(ctx).toMatchObject({
      actionId: 'mark_finished',
      data: { entityType: 'product', entityId: 12, url: '/products/12' },
      categoryId: 'expiry_day',
      channelId: 'expiry',
      now: NOW,
      settings: { snoozeMinutes: 30 },
    });
    expect(navigate).not.toHaveBeenCalled();
    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith(`${data.key}#abc`);
    unregisterAction('expiry_day', 'mark_finished');
  });

  it('snoozes a routine: a copy after the snooze length, in the background too', async () => {
    await handleResponse(response('snooze'), { background: true, now: NOW });
    const copy = os.pending.get(snoozeIdFor(data.key));
    expect(copy).toMatchObject({
      fireAt: NOW + 30 * 60 * 1000,
      title: 'Evening routine',
      body: 'Evening routine: 5 steps',
      categoryId: 'routine',
      channelId: 'routines',
      data: { url: '/player/5', entityType: 'routine', entityId: 5 },
    });
  });

  it('opens the screen for a button no feature has registered yet', async () => {
    setLocked(false);
    await handleResponse(response('buy_again', { categoryIdentifier: 'expiry_warning' }));
    expect(navigate).toHaveBeenCalledWith('/player/5');
  });
});

describe('readData', () => {
  it('accepts our data and rejects anything else', () => {
    expect(readData(data)).toEqual(data);
    expect(readData({ ...data, entityId: undefined, channelId: 'x' })).toEqual({
      ...data,
      entityId: null,
      channelId: 'digest',
    });
    expect(readData(null)).toBeNull();
    expect(readData({ ...data, url: 'products/12' })).toBeNull();
    expect(readData({ ...data, entityType: 'shop' })).toBeNull();
    expect(readData({ ...data, kind: 'other' })).toBeNull();
  });
});

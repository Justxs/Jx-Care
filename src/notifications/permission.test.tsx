import { act, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { AppState, Linking } from 'react-native';

import { qk } from '@/db/queryKeys';
import { queryClient } from '@/db/queryClient';
import { setupTestApp } from '@/test/render';

import {
  getPermission,
  openPhoneSettings,
  requestPermission,
  toPermissionState,
  usePermission,
} from './permission';

type Status = Notifications.NotificationPermissionsStatus;
const status = (over: Partial<Status>): Status =>
  ({
    status: 'undetermined',
    granted: false,
    canAskAgain: true,
    expires: 'never',
    ...over,
  }) as Status;

// requestPermission writes to the app's query client; its garbage-collection timer must not
// outlive the tests.
afterAll(() => queryClient.clear());

describe('toPermissionState', () => {
  it('maps the expo status', () => {
    expect(
      toPermissionState(status({ status: 'granted' as Status['status'], granted: true })),
    ).toBe('granted');
    expect(toPermissionState(status({ status: 'denied' as Status['status'] }))).toBe('denied');
    expect(toPermissionState(status({}))).toBe('undetermined');
    expect(
      toPermissionState(
        status({
          ios: { status: Notifications.IosAuthorizationStatus.PROVISIONAL } as Status['ios'],
        }),
      ),
    ).toBe('granted');
  });
});

describe('permission calls', () => {
  it('reads the current permission', async () => {
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValueOnce(status({ status: 'denied' as Status['status'] }));
    await expect(getPermission()).resolves.toBe('denied');
  });

  it('asks and stores the answer for the banner', async () => {
    jest
      .mocked(Notifications.requestPermissionsAsync)
      .mockResolvedValueOnce(status({ status: 'granted' as Status['status'], granted: true }));
    await expect(requestPermission()).resolves.toBe('granted');
    expect(queryClient.getQueryData(qk.notifications.permission)).toBe('granted');
  });

  it('opens phone settings', async () => {
    const spy = jest.spyOn(Linking, 'openSettings').mockResolvedValueOnce(undefined);
    await openPhoneSettings();
    expect(spy).toHaveBeenCalled();
  });
});

describe('usePermission', () => {
  it('re-checks when the app returns to the foreground', async () => {
    let onChange: ((state: string) => void) | undefined;
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, fn) => {
      onChange = fn as (state: string) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValueOnce(status({ status: 'denied' as Status['status'] }));
    const app = setupTestApp();
    const { result } = await app.renderHook(() => usePermission());
    await waitFor(() => expect(result.current).toBe('denied'));

    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValueOnce(status({ status: 'granted' as Status['status'], granted: true }));
    await act(async () => onChange?.('active'));
    await waitFor(() => expect(result.current).toBe('granted'));
    spy.mockRestore();
  });
});

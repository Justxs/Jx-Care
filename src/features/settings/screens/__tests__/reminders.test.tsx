import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { qk } from '@/db/queryKeys';
import '@/features/products/reminders';
import { createProduct } from '@/features/products/repo';
import { getSettings, saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { setPermissionAdapter } from '@/notifications/askPermission';
import { createFakeOS, type FakeOS } from '@/notifications/fakeOS';
import { setNotificationOS } from '@/notifications/scheduler';
import type { PermissionState } from '@/notifications/types';
import { setupTestApp } from '@/test/render';

import { RemindersScreen } from '../RemindersScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(() => Promise.resolve()) }));
jest.mock('@/db/queryClient', () => {
  const actual = jest.requireActual('@/db/queryClient');
  return { ...actual, queryClient: actual.createQueryClient({ gcTime: Infinity }) };
});

let os: FakeOS;

beforeEach(async () => {
  await setI18nLanguage('en');
  os = createFakeOS();
  setNotificationOS(os);
});

afterEach(() => {
  setNotificationOS(null);
  setPermissionAdapter(null);
});

async function renderScreen(permission: PermissionState) {
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en' });
  app.client.setQueryData(qk.notifications.permission, permission);
  os.permission = permission;
  await app.render(<RemindersScreen />);
  return app;
}

const switchFor = (name: string) => screen.getByRole('switch', { name });

describe('RemindersScreen (S5)', () => {
  it('shows the defaults', async () => {
    await renderScreen('granted');
    expect(switchFor('Expiry warning')).not.toBeChecked();
    expect(switchFor('Routine reminders')).toBeChecked();
    expect(switchFor('Hair tasks')).toBeChecked();
    expect(switchFor('Weekly photo')).not.toBeChecked();
    expect(switchFor('Weekly digest')).toBeChecked();
    expect(screen.getByRole('radio', { name: '15 min' })).toBeChecked();
    expect(screen.queryByText('Notifications are off in phone settings')).toBeNull();
  });

  it('saves every setting at once and schedules', async () => {
    const app = await renderScreen('granted');
    createProduct(app.db, {
      name: 'Vitamin C serum',
      brand: null,
      area: 'skin',
      category: 'serum',
      size: null,
      unit: null,
      price: null,
      purchasedAt: null,
      expiresAt: '2026-10-10',
      openedAt: null,
      paoMonths: null,
      notes: null,
      photoUri: null,
      ingredients: [],
    });

    await fireEvent.press(switchFor('Expiry warning'));
    await waitFor(() => expect(getSettings(app.db).expiryRemindersOn).toBe(true));
    // Turning them on here answers the product form's ask too.
    expect(getSettings(app.db).reminderAskDone).toBe(true);
    // Every change re-plans the notifications.
    await waitFor(() => expect(os.schedule).toHaveBeenCalled());

    await fireEvent.press(screen.getByRole('radio', { name: '14 days' }));
    await fireEvent.press(switchFor('Expiry day'));
    await fireEvent.press(switchFor('Routine reminders'));
    await fireEvent.press(switchFor('Hair tasks'));
    await fireEvent.press(switchFor('Weekly photo'));
    await fireEvent.press(switchFor('Weekly digest'));
    await fireEvent.press(screen.getByRole('radio', { name: '5 min' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Wednesday' }));

    await waitFor(() =>
      expect(getSettings(app.db)).toMatchObject({
        expiryRemindersOn: true,
        expiryWarnDays: 14,
        expiryDayReminderOn: false,
        routineRemindersOn: false,
        hairRemindersOn: false,
        weeklyPhotoOn: true,
        weeklyPhotoWeekday: 3,
        weeklyDigestOn: false,
        snoozeMinutes: 5,
      }),
    );
    expect(switchFor('Expiry day')).not.toBeChecked();
    expect(switchFor('Weekly photo')).toBeChecked();
  });

  it('asks for permission first when it was never asked', async () => {
    const request = jest.fn(async () => 'granted' as const);
    setPermissionAdapter({ get: async () => 'undetermined', request });
    const app = await renderScreen('undetermined');

    await fireEvent.press(switchFor('Weekly photo'));
    await waitFor(() => expect(getSettings(app.db).weeklyPhotoOn).toBe(true));
    expect(request).toHaveBeenCalledTimes(1);

    // Turning one off never asks.
    await fireEvent.press(switchFor('Hair tasks'));
    await waitFor(() => expect(getSettings(app.db).hairRemindersOn).toBe(false));
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('with permission off shows the card and the saved states as text', async () => {
    const app = await renderScreen('denied');
    expect(screen.getByText('Notifications are off in phone settings')).toBeTruthy();
    expect(
      screen.getByText(
        'Your choices below are kept, but nothing is sent until notifications are on.',
      ),
    ).toBeTruthy();
    expect(screen.queryAllByRole('switch')).toHaveLength(0);
    expect(screen.getByLabelText('Expiry warning, Off')).toBeTruthy();
    expect(screen.getByLabelText('Routine reminders, Paused')).toBeTruthy();
    expect(screen.getAllByText('Paused')).toHaveLength(3);
    expect(screen.getAllByText('Off')).toHaveLength(2);

    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValueOnce(undefined);
    await fireEvent.press(screen.getByRole('button', { name: 'Open phone settings' }));
    expect(openSettings).toHaveBeenCalled();

    // Permission comes back (re-checked on return to the foreground): switches return, and the
    // card keeps its space so the list doesn't jump.
    await act(async () => {
      app.client.setQueryData(qk.notifications.permission, 'granted');
    });
    expect(await screen.findByRole('switch', { name: 'Routine reminders' })).toBeChecked();
    expect(screen.queryByText('Paused')).toBeNull();
    const card = screen.getByTestId('permission-card', { includeHiddenElements: true });
    expect(card.props.accessibilityElementsHidden).toBe(true);
    expect(screen.queryByText('Notifications are off in phone settings')).toBeNull();
  });
});

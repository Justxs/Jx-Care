import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';

import type { Db } from '@/db';
import { createFakeFiles } from '@/features/progress/fakeFiles';
import { saveCheckIn, thisWeekStatus } from '@/features/progress/repo';
import { useWeeklyPhotoOptional } from '@/features/progress/useWeeklyPhotoOptional';
import { getSettings, saveSettings, type SettingsPatch } from '@/features/settings/repo';
import { OptionalGroup } from '@/features/today/components/SetupCard';
import { prefetchToday } from '@/features/today/prefetch';
import { useWeeklyPhotoSlot } from '@/features/today/slots';
import { setI18nLanguage } from '@/i18n';
import { setPermissionAdapter } from '@/notifications/askPermission';
import type { PermissionState } from '@/notifications/types';
import { appStore } from '@/state/app';
import { dismissToast, runToastAction, uiStore } from '@/state/ui';
import { setupTestApp } from '@/test/render';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn() },
}));
jest.mock('@/features/progress/files', () => ({
  progressFiles: jest.requireActual('@/features/progress/fakeFiles').createFakeFiles(),
}));

const { router } = jest.requireMock<{ router: { push: jest.Mock } }>('expo-router');

// Week of Monday 5 Oct 2026; Sunday is 11 Oct.
const WEEK = '2026-10-05';
const SAT = '2026-10-10';
const SUN = '2026-10-11';

function setup(day: string, patch: SettingsPatch = {}) {
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en', weeklyPhotoOn: true, ...patch });
  appStore.setState((s) => ({ ...s, activeDay: day }));
  return app;
}

/** Today's Check-in slot on its own. */
function PhotoSlot() {
  const row = useWeeklyPhotoSlot();
  return <View testID="slot">{row}</View>;
}

async function renderSlot(app: ReturnType<typeof setup>) {
  await prefetchToday(app.client, appStore.state.activeDay);
  await app.render(<PhotoSlot />);
}

function takePhoto(db: Db) {
  saveCheckIn(
    db,
    {
      area: 'skin',
      weekStart: WEEK,
      photos: [{ angle: 'front', fileUri: 'file:///documents/progress/skin/2026-10-05/f.jpg' }],
      rating: null,
      tags: [],
      note: null,
    },
    createFakeFiles(),
  );
}

beforeEach(async () => {
  await setI18nLanguage('en');
  uiStore.setState((s) => ({ ...s, toasts: [] }));
  router.push.mockClear();
});

afterEach(() => {
  for (const toast of uiStore.state.toasts) dismissToast(toast.id);
});

describe("Today's weekly photo row", () => {
  it('shows on the photo day with Take photo as a secondary button and Skip as a text link', async () => {
    const app = setup(SUN);
    await renderSlot(app);

    expect(screen.getByText("This week's skin photo")).toBeTruthy();
    const take = screen.getByRole('button', { name: 'Take photo' });
    expect(take.props.className).toContain('border-border-strong');
    expect(take.props.className).not.toContain('bg-accent');
    const skip = screen.getByRole('button', { name: 'Skip this week' });
    // A plain link: no fill and no border, but a 44 pt target.
    expect(skip.props.className).not.toMatch(/\bbg-|\bborder\b/);
    expect(skip.props.className).toContain('min-h-[44px]');

    await fireEvent.press(take);
    expect(router.push).toHaveBeenCalledWith('/progress/camera?area=skin');
  });

  it('shows from the chosen weekday to the end of the week only', async () => {
    const before = setup(SAT);
    await renderSlot(before);
    expect(screen.queryByTestId('weekly-photo-row')).toBeNull();

    const wednesday = setup(SAT, { weeklyPhotoWeekday: 3 });
    await renderSlot(wednesday);
    expect(screen.getByTestId('weekly-photo-row')).toBeTruthy();
  });

  it('is hidden when Weekly photo is off or the photo is taken', async () => {
    const off = setup(SUN, { weeklyPhotoOn: false });
    await renderSlot(off);
    expect(screen.queryByTestId('weekly-photo-row')).toBeNull();

    const taken = setup(SUN);
    takePhoto(taken.db);
    await renderSlot(taken);
    expect(screen.queryByTestId('weekly-photo-row')).toBeNull();
  });

  it('Skip this week hides it for the week, with Undo', async () => {
    const app = setup(SUN);
    await renderSlot(app);
    await fireEvent.press(screen.getByRole('button', { name: 'Skip this week' }));

    await waitFor(() => expect(screen.queryByTestId('weekly-photo-row')).toBeNull());
    expect(thisWeekStatus(app.db, 'skin', SUN)).toBe('skipped');
    const toast = uiStore.state.toasts[0]!;
    expect(toast.message).toBe("This week's photo skipped");

    await act(async () => runToastAction(toast.id));
    expect(await screen.findByTestId('weekly-photo-row')).toBeTruthy();
    expect(thisWeekStatus(app.db, 'skin', SUN)).toBe('due');
  });
});

function Optional() {
  const photo = useWeeklyPhotoOptional();
  return (
    <>
      <OptionalGroup onPhoto={photo.press} onAvoid={() => {}} photoDetail={photo.detail} />
      <Pressable accessibilityRole="button" onPress={photo.press}>
        <Text>{photo.on ? 'on' : 'off'}</Text>
      </Pressable>
    </>
  );
}

function fakePermission(state: PermissionState) {
  const adapter = { get: jest.fn(async () => state), request: jest.fn(async () => state) };
  setPermissionAdapter(adapter);
  return adapter;
}

describe('Weekly photo in the Optional group', () => {
  afterEach(() => setPermissionAdapter(null));

  it('turns Weekly photo on after the reminder ask', async () => {
    const permission = fakePermission('granted');
    const app = setup(SUN, { weeklyPhotoOn: false });
    await app.render(<Optional />);
    expect(screen.getByText('One photo a week shows how your skin changes.')).toBeTruthy();

    await fireEvent.press(screen.getByText('Weekly progress photo'));
    await waitFor(() => expect(getSettings(app.db).weeklyPhotoOn).toBe(true));
    expect(permission.get).toHaveBeenCalled();
    const toast = uiStore.state.toasts[0]!;
    expect(toast.message).toBe('Weekly photo on: Sundays at 10:00');
    expect(await screen.findByText('On · Sundays at 10:00')).toBeTruthy();

    // Once on, the row opens Reminders to change the day and time.
    await fireEvent.press(screen.getByText('Weekly progress photo'));
    expect(router.push).toHaveBeenCalledWith('/settings/reminders');

    // Undo turns it off again.
    await act(async () => runToastAction(toast.id));
    await waitFor(() => expect(getSettings(app.db).weeklyPhotoOn).toBe(false));
  });

  it('keeps it on but says so when notifications are off in phone settings', async () => {
    const permission = fakePermission('denied');
    const app = setup(SUN, { weeklyPhotoOn: false });
    await app.render(<Optional />);
    await fireEvent.press(screen.getByText('Weekly progress photo'));
    await waitFor(() => expect(getSettings(app.db).weeklyPhotoOn).toBe(true));
    expect(permission.request).not.toHaveBeenCalled();
    expect(uiStore.state.toasts[0]?.message).toBe('Notifications are off in phone settings');
  });
});

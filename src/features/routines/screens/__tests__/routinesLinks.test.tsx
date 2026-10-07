import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, screen } from '@testing-library/react-native';

import { saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { appStore } from '@/state/app';
import { setupTestApp } from '@/test/render';

import { RoutinesScreen } from '../RoutinesScreen';

const mockParams: { current: Record<string, string> } = { current: {} };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: () => mockParams.current,
}));

const { router } = jest.requireMock<{ router: { setParams: jest.Mock } }>('expo-router');

function show(params: Record<string, string>) {
  mockParams.current = params;
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en' });
  return app.render(
    <>
      <RoutinesScreen />
      <PortalHost />
    </>,
  );
}

const cleared = { segment: undefined, starter: undefined, setup: undefined };
const selected = (name: string) =>
  screen.getByRole('radio', { name }).props.accessibilityState.checked as boolean;

beforeEach(async () => {
  await setI18nLanguage('en');
  appStore.setState((s) => ({ ...s, activeDay: '2026-10-07' }));
  router.setParams.mockClear();
});

describe('RoutinesScreen links from Today', () => {
  it('opens on Skin with no link and leaves the params alone', async () => {
    await show({});
    expect(await screen.findByText('No routines yet')).toBeTruthy();
    expect(selected('Skin')).toBe(true);
    expect(router.setParams).not.toHaveBeenCalled();
  });

  it('segment=hair shows the Hair segment, then clears the param', async () => {
    await show({ segment: 'hair' });
    expect(await screen.findByText('Hair care is not set up')).toBeTruthy();
    expect(selected('Hair')).toBe(true);
    // No Fab hiding behind a sheet: the setup sheet stays closed.
    expect(screen.getByRole('button', { name: 'New hair task' })).toBeTruthy();
    expect(router.setParams).toHaveBeenCalledWith(cleared);
  });

  it('setup=1 opens the quick hair setup on Hair', async () => {
    await show({ segment: 'hair', setup: '1' });
    expect(await screen.findByText('Hair care is not set up')).toBeTruthy();
    // The Fab hides while the setup sheet is open.
    expect(screen.queryByRole('button', { name: 'New hair task' })).toBeNull();
    expect(router.setParams).toHaveBeenCalledWith(cleared);

    // Leaving Hair and coming back does not open it again.
    await fireEvent.press(screen.getByRole('radio', { name: 'Skin' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Hair' }));
    expect(await screen.findByRole('button', { name: 'New hair task' })).toBeTruthy();
  });

  it('starter=1 opens the starter sheet once', async () => {
    await show({ starter: '1' });
    expect(await screen.findByText('No routines yet')).toBeTruthy();
    // The skin Fab hides while the starter sheet is open.
    expect(screen.getAllByRole('button', { name: 'New routine' })).toHaveLength(1);
    expect(router.setParams).toHaveBeenCalledWith(cleared);
  });
});

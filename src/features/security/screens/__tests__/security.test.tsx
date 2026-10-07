import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import * as LocalAuthentication from 'expo-local-authentication';
import { Slot } from 'expo-router';
import { Text } from 'react-native';

import { qk } from '@/db/queryKeys';
import type { AppSettings } from '@/features/settings/repo';
import { getSettings, saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { dismissToast, uiStore } from '@/state/ui';
import { setupTestApp } from '@/test/render';

import ChangePinRoute from '../../../../../app/security/change-pin';
import RecoveryRoute from '../../../../../app/security/recovery';
import { shouldLockOnReturn } from '../../lock';
import { pinService } from '../../pin';
import { recoveryFormValues } from '../ChangeRecoveryScreen';
import { MISMATCH_BACK_MS } from '../ForgotPinScreen';
import { SecurityScreen } from '../SecurityScreen';

jest.mock('expo-crypto', () => {
  const nodeCrypto = jest.requireActual<typeof import('crypto')>('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    getRandomBytes: (n: number) => new Uint8Array(nodeCrypto.randomBytes(n)),
    digestStringAsync: async (_algorithm: string, data: string) =>
      nodeCrypto.createHash('sha256').update(data).digest('hex'),
  };
});

const mockSecure = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockSecure.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecure.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecure.delete(key);
  }),
}));

jest.mock('expo-local-authentication', () => ({
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Error: 'error' },
}));

const auth = jest.mocked(LocalAuthentication);

function phoneHasFaceId(on: boolean) {
  auth.hasHardwareAsync.mockResolvedValue(on);
  auth.isEnrolledAsync.mockResolvedValue(on);
  auth.supportedAuthenticationTypesAsync.mockResolvedValue(
    on ? [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION] : [],
  );
}

function RootLayout() {
  return (
    <>
      <Slot />
      <PortalHost />
    </>
  );
}

const routes = {
  _layout: RootLayout,
  index: () => <Text>Home stub</Text>,
  'settings/security': SecurityScreen,
  'security/change-pin': ChangePinRoute,
  'security/recovery': RecoveryRoute,
};

let currentPath: () => string = () => '';

async function setUp(opts: { biometricsOn?: boolean } = {}) {
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en', biometricsOn: opts.biometricsOn ?? false });
  await pinService.completeOnboarding({
    pin: '2580',
    question: { kind: 'preset', id: 'first_pet' },
    answer: 'Rex',
  });
  return app;
}

/** Opens the security screen with Home underneath, so going back has somewhere to go. */
async function launch(app: ReturnType<typeof setupTestApp>, path: string) {
  app.client.setQueryData(qk.settings, getSettings(app.db));
  const result = renderRouter(routes, { initialUrl: '/', wrapper: app.wrapper });
  currentPath = () => result.getPathname();
  await result;
  const { router } = jest.requireActual<typeof import('expo-router')>('expo-router');
  await act(async () => router.push(path as never));
  await waitFor(() => expect(currentPath()).toBe(path));
  return result;
}

async function typePin(pin: string) {
  for (const digit of pin) {
    const keys = screen.getAllByRole('button', { name: digit });
    await fireEvent.press(keys[keys.length - 1]!);
  }
}

function toastMessages() {
  return uiStore.state.toasts.map((t) => t.message);
}

function pinFailures(): number {
  const raw = mockSecure.get('pinAttempts');
  return raw ? (JSON.parse(raw) as { failures: number }).failures : 0;
}

beforeEach(async () => {
  await setI18nLanguage('en');
  mockSecure.clear();
  jest.clearAllMocks();
  phoneHasFaceId(false);
  auth.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' } as never);
});

afterEach(() => {
  for (const toast of uiStore.state.toasts) dismissToast(toast.id);
  jest.useRealTimers();
});

describe('S6 security screen', () => {
  it('shows the rows, and hides the biometrics switch without hardware', async () => {
    const app = await setUp();
    await launch(app, '/settings/security');
    expect(screen.getByRole('header', { name: 'PIN and security' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Change PIN' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recovery question' })).toBeTruthy();
    expect(screen.getByText('Lock after')).toBeTruthy();
    await waitFor(() => expect(auth.hasHardwareAsync).toHaveBeenCalled());
    expect(screen.queryByRole('switch', { name: 'Unlock with Face ID' })).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Unlock with fingerprint' })).toBeNull();
  });

  it('turns biometrics on only after a successful prompt, and off without one', async () => {
    phoneHasFaceId(true);
    const app = await setUp();
    await launch(app, '/settings/security');
    const toggle = await screen.findByRole('switch', { name: 'Unlock with Face ID' });
    expect(toggle).not.toBeChecked();

    // A cancelled prompt leaves it off and says so.
    await fireEvent.press(toggle);
    expect(await screen.findByText('Not turned on. Try again.')).toBeTruthy();
    expect(auth.authenticateAsync).toHaveBeenCalledTimes(1);
    expect(getSettings(app.db).biometricsOn).toBe(false);

    auth.authenticateAsync.mockResolvedValue({ success: true } as never);
    await fireEvent.press(screen.getByRole('switch', { name: 'Unlock with Face ID' }));
    await waitFor(() => expect(getSettings(app.db).biometricsOn).toBe(true));
    expect(auth.authenticateAsync).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Not turned on. Try again.')).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Unlock with Face ID' })).toBeChecked(),
    );

    // Off needs no prompt.
    await fireEvent.press(screen.getByRole('switch', { name: 'Unlock with Face ID' }));
    await waitFor(() => expect(getSettings(app.db).biometricsOn).toBe(false));
    expect(auth.authenticateAsync).toHaveBeenCalledTimes(2);
  });

  it('saves the auto-lock time where the lock reads it', async () => {
    const app = await setUp();
    await launch(app, '/settings/security');
    expect(getSettings(app.db).autoLockSeconds).toBe(60);
    await fireEvent.press(screen.getByRole('combobox', { name: 'Lock after, 1 min' }));
    await fireEvent.press(await screen.findByText('5 min'));
    await waitFor(() => expect(getSettings(app.db).autoLockSeconds).toBe(300));
    // The lock layer reads the cached settings on return from the background.
    const cached = app.client.getQueryData<AppSettings>(qk.settings);
    expect(cached?.autoLockSeconds).toBe(300);
    expect(shouldLockOnReturn(0, 4 * 60_000, cached!.autoLockSeconds, false)).toBe(false);

    await fireEvent.press(await screen.findByRole('combobox', { name: 'Lock after, 5 min' }));
    await fireEvent.press(await screen.findByText('Immediately'));
    await waitFor(() => expect(getSettings(app.db).autoLockSeconds).toBe(0));
    expect(await screen.findByRole('combobox', { name: 'Lock after, Immediately' })).toBeTruthy();
  });

  it('pushes the change PIN and recovery flows', async () => {
    const app = await setUp();
    await launch(app, '/settings/security');
    await fireEvent.press(screen.getByRole('button', { name: 'Change PIN' }));
    await waitFor(() => expect(currentPath()).toBe('/security/change-pin'));
    expect(screen.getByText('Enter your current PIN')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(currentPath()).toBe('/settings/security'));
    await fireEvent.press(screen.getByRole('button', { name: 'Recovery question' }));
    await waitFor(() => expect(currentPath()).toBe('/security/recovery'));
    expect(screen.getByText('Changing the recovery question needs your PIN.')).toBeTruthy();
  });
});

describe('Change PIN', () => {
  it('needs the old PIN, checks the new one twice, and the new PIN works afterwards', async () => {
    const app = await setUp();
    await launch(app, '/security/change-pin');
    expect(screen.getByText('Enter your current PIN')).toBeTruthy();

    // A wrong old PIN counts toward the lock screen's lockout.
    await typePin('1111');
    expect(await screen.findByText('Wrong PIN. Try again.')).toBeTruthy();
    expect(pinFailures()).toBe(1);

    await typePin('2580');
    expect(await screen.findByText('Create a new PIN')).toBeTruthy();
    expect(pinFailures()).toBe(0);

    // The O2 rules.
    await typePin('1234');
    expect(await screen.findByText('1234 is too easy to guess. Try another.')).toBeTruthy();
    await typePin('1470');

    // A mismatch goes back to the new PIN step.
    expect(await screen.findByText('Enter it again')).toBeTruthy();
    jest.useFakeTimers({ advanceTimers: true });
    await typePin('1471');
    expect(await screen.findByText("PINs don't match")).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(MISMATCH_BACK_MS);
    });
    expect(await screen.findByText('Create a new PIN')).toBeTruthy();
    jest.useRealTimers();

    await typePin('1470');
    expect(await screen.findByText('Enter it again')).toBeTruthy();
    await typePin('1470');

    await waitFor(() => expect(currentPath()).toBe('/'));
    expect(toastMessages()).toEqual(['PIN changed']);
    expect((await pinService.verifyPin('1470', Date.now())).ok).toBe(true);
    expect((await pinService.verifyPin('2580', Date.now())).ok).toBe(false);
  });

  it('locks the keypad after the 5th wrong old PIN, like the lock screen', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-07T10:00:00Z'), advanceTimers: true });
    const app = await setUp();
    await launch(app, '/security/change-pin');
    for (let i = 0; i < 5; i++) {
      await typePin('1111');
      await waitFor(() => expect(pinFailures()).toBe(i + 1));
    }
    expect(await screen.findByText('Try again in 30 s')).toBeTruthy();
    // Even the right PIN does nothing while locked.
    await typePin('2580');
    expect(screen.queryByText('Create a new PIN')).toBeNull();
    expect(await pinService.lockoutRemaining(Date.now())).toBeGreaterThan(0);

    await act(async () => {
      jest.advanceTimersByTime(31_000);
    });
    await waitFor(() => expect(screen.queryByText(/Try again in/)).toBeNull());
    await typePin('2580');
    expect(await screen.findByText('Create a new PIN')).toBeTruthy();
  });

  it('steps back through the flow, then leaves', async () => {
    const app = await setUp();
    await launch(app, '/security/change-pin');
    await typePin('2580');
    expect(await screen.findByText('Create a new PIN')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Enter your current PIN')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(currentPath()).toBe('/'));
    expect((await pinService.verifyPin('2580', Date.now())).ok).toBe(true);
  });
});

describe('Recovery question', () => {
  it('starts from the saved question', () => {
    expect(recoveryFormValues({ kind: 'preset', id: 'birth_city' })).toEqual({
      questionId: 'birth_city',
      customText: '',
      answer: '',
    });
    expect(recoveryFormValues({ kind: 'custom', text: 'Best friend?' })).toEqual({
      questionId: 'custom',
      customText: 'Best friend?',
      answer: '',
    });
    expect(recoveryFormValues(null).questionId).toBe('');
  });

  it('needs the PIN, then saves a new question and answer that Forgot PIN accepts', async () => {
    const app = await setUp();
    await launch(app, '/security/recovery');
    expect(screen.getByText('Enter your PIN')).toBeTruthy();
    expect(screen.queryByLabelText('Answer')).toBeNull();

    await typePin('1111');
    expect(await screen.findByText('Wrong PIN. Try again.')).toBeTruthy();
    expect(pinFailures()).toBe(1);
    await typePin('2580');

    // The O4 form, with the saved question picked and an empty, hidden answer.
    const answer = await screen.findByLabelText('Answer');
    expect(answer.props.secureTextEntry).toBe(true);
    expect(
      screen.getByRole('radio', { name: 'What was the name of your first pet?' }),
    ).toBeChecked();

    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Use at least 3 characters.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: 'Write my own' }));
    await fireEvent.changeText(screen.getByLabelText('Your question'), 'Favourite colour?');
    await fireEvent.changeText(screen.getByLabelText('Answer'), ' Blue ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(currentPath()).toBe('/'));
    expect(toastMessages()).toEqual(['Recovery question changed']);
    expect(await pinService.getRecoveryQuestion()).toEqual({
      kind: 'custom',
      text: 'Favourite colour?',
    });
    expect((await pinService.verifyRecoveryAnswer('Rex', Date.now())).ok).toBe(false);
    expect((await pinService.verifyRecoveryAnswer('blue', Date.now())).ok).toBe(true);
  });

  it('asks before throwing away a typed answer', async () => {
    const app = await setUp();
    await launch(app, '/security/recovery');
    await typePin('2580');
    await fireEvent.changeText(await screen.findByLabelText('Answer'), 'Rexy');
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Discard changes?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(currentPath()).toBe('/'));
    expect((await pinService.verifyRecoveryAnswer('Rex', Date.now())).ok).toBe(true);
  });
});

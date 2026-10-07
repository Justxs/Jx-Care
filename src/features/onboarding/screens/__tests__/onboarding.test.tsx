import {
  act,
  fireEvent,
  renderRouter,
  screen,
  testRouter,
  waitFor,
} from 'expo-router/testing-library';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';

import { getSettings, hasSettingsRow, saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { lockStore, setLocked } from '@/state/lock';
import { setupTestApp } from '@/test/render';

import OnboardingStack from '../../../../../app/(onboarding)/_layout';
import BiometricsRoute from '../../../../../app/(onboarding)/biometrics';
import ConfirmPinRoute from '../../../../../app/(onboarding)/confirm-pin';
import CreatePinRoute from '../../../../../app/(onboarding)/create-pin';
import RecoveryRoute from '../../../../../app/(onboarding)/recovery';
import WelcomeRoute from '../../../../../app/(onboarding)/welcome';
import TabsLayout from '../../../../../app/(tabs)/_layout';
import TodayRoute from '../../../../../app/(tabs)/index';
import { clearDraft } from '../../draft';
import { checkOnboarding, gateStore } from '../../gate';

jest.mock('expo-crypto', () => {
  const nodeCrypto = jest.requireActual<typeof import('crypto')>('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    getRandomBytes: (n: number) => new Uint8Array(nodeCrypto.randomBytes(n)),
    digestStringAsync: async (_algorithm: string, data: string) =>
      nodeCrypto.createHash('sha256').update(data).digest('hex'),
  };
});

// The phone's secure storage, as a map the tests can look into.
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

const routes = {
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': TodayRoute,
  '(onboarding)/_layout': OnboardingStack,
  '(onboarding)/welcome': WelcomeRoute,
  '(onboarding)/create-pin': CreatePinRoute,
  '(onboarding)/confirm-pin': ConfirmPinRoute,
  '(onboarding)/recovery': RecoveryRoute,
  '(onboarding)/biometrics': BiometricsRoute,
};

function phoneHasFaceId(on: boolean) {
  auth.hasHardwareAsync.mockResolvedValue(on);
  auth.isEnrolledAsync.mockResolvedValue(on);
  auth.supportedAuthenticationTypesAsync.mockResolvedValue(
    on ? [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION] : [],
  );
}

/** Presses keys on the screen on top (screens under it in the stack stay mounted). */
async function typePin(pin: string) {
  for (const digit of pin) {
    const keys = screen.getAllByRole('button', { name: digit });
    await fireEvent.press(keys[keys.length - 1]!);
  }
}

async function press(name: string | RegExp) {
  const buttons = screen.getAllByRole('button', { name });
  await fireEvent.press(buttons[buttons.length - 1]!);
}

let currentPath: () => string = () => '';

/** Renders the app's routes at `url`, after the boot check, and keeps the pathname readable. */
async function launch(app: ReturnType<typeof setupTestApp>, url: string) {
  await checkOnboarding(app.db);
  const result = renderRouter(routes, { initialUrl: url, wrapper: app.wrapper });
  currentPath = () => result.getPathname();
  await result;
}

async function startFirstLaunch() {
  const app = setupTestApp();
  await launch(app, '/');
  return app;
}

beforeEach(async () => {
  await setI18nLanguage('en');
  mockSecure.clear();
  clearDraft();
  gateStore.setState(() => ({ pinMissing: false }));
  setLocked(true);
  jest.clearAllMocks();
  phoneHasFaceId(true);
  auth.authenticateAsync.mockResolvedValue({ success: true } as never);
});

describe('onboarding', () => {
  it('walks O1 to O5 and lands on Today, saving only after O4', async () => {
    const app = await startFirstLaunch();

    // O1: language as a radio list, pre-selected from the phone; picking re-renders at once.
    expect(await screen.findByText('Track your skin and hair care in one place')).toBeTruthy();
    expect(screen.getByText('Everything stays on this phone. No account needed.')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'English. Anglų' })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: 'Lietuvių. Lithuanian' }));
    expect(await screen.findByText('Viskas lieka šiame telefone. Paskyros nereikia.')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Lietuvių. Lithuanian' })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: 'English. Anglų' }));
    expect(
      await screen.findByText('Everything stays on this phone. No account needed.'),
    ).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Step 1 of 5' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    await press('Continue');

    // O2: a weak PIN is refused in place, with the shake's haptic, and the dots clear.
    await waitFor(() => expect(currentPath()).toBe('/create-pin'));
    expect(screen.getByText('Create a 4-digit PIN')).toBeTruthy();
    await typePin('1234');
    expect(screen.getByText('1234 is too easy to guess. Try another.')).toBeTruthy();
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('0 of 4 digits entered')).toBeTruthy();
    await typePin('7777');
    expect(screen.getByText('7777 is too easy to guess. Try another.')).toBeTruthy();
    await typePin('2580');

    // O3: a mismatch shakes, says so and goes back to O2 with empty dots.
    await waitFor(() => expect(currentPath()).toBe('/confirm-pin'));
    expect(screen.getByText('Enter it again')).toBeTruthy();
    await typePin('2581');
    expect(screen.getByText("PINs don't match")).toBeTruthy();
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(3);
    await waitFor(() => expect(currentPath()).toBe('/create-pin'));
    expect(screen.getByText("PINs don't match")).toBeTruthy();
    await typePin('2580');
    await waitFor(() => expect(currentPath()).toBe('/confirm-pin'));
    await typePin('2580');

    // O4: nothing saved yet.
    await waitFor(() => expect(currentPath()).toBe('/recovery'));
    expect(mockSecure.size).toBe(0);
    expect(hasSettingsRow(app.db)).toBe(false);
    expect(screen.getByText('Hidden as you type. Tap the eye to check it.')).toBeTruthy();

    await press('Continue');
    expect(await screen.findByText('Choose a question.')).toBeTruthy();
    expect(screen.getByText('Use at least 3 characters.')).toBeTruthy();

    // "Write my own" opens a field for the question.
    await fireEvent.press(screen.getByRole('radio', { name: 'Write my own' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Write your question.')).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('radio', { name: 'What was the name of your first pet?' }),
    );

    // The answer is hidden as typed; the eye shows it.
    const answer = screen.getByLabelText('Answer');
    expect(answer.props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Show answer' }));
    expect(screen.getByLabelText('Answer').props.secureTextEntry).toBe(false);
    expect(screen.getByRole('button', { name: 'Hide answer' })).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Answer'), 'Rex');
    await press('Continue');

    // O5: saved now; Face ID offered.
    await waitFor(() => expect(currentPath()).toBe('/biometrics'));
    expect(screen.getByText('Unlock with Face ID?')).toBeTruthy();
    expect(mockSecure.has('pin')).toBe(true);
    expect(mockSecure.has('recovery')).toBe(true);
    expect(getSettings(app.db)).toMatchObject({
      language: 'en',
      currency: 'EUR',
      biometricsOn: false,
    });
    expect(lockStore.state.locked).toBe(false);

    await press('Turn on');
    expect(auth.authenticateAsync).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(currentPath()).toBe('/'));
    expect(getSettings(app.db).biometricsOn).toBe(true);
    expect(testRouter.canGoBack()).toBe(false);
  });

  it('skips O5 on a phone without biometrics, saving the picked language', async () => {
    phoneHasFaceId(false);
    const app = await startFirstLaunch();
    await fireEvent.press(await screen.findByRole('radio', { name: 'Lietuvių. Lithuanian' }));
    await press('Tęsti');
    await waitFor(() => expect(currentPath()).toBe('/create-pin'));
    await typePin('2580');
    await waitFor(() => expect(currentPath()).toBe('/confirm-pin'));
    await typePin('2580');
    await waitFor(() => expect(currentPath()).toBe('/recovery'));
    await fireEvent.press(screen.getByRole('radio', { name: 'Kuriame mieste gimėte?' }));
    await fireEvent.changeText(screen.getByLabelText('Atsakymas'), 'Vilnius');
    await press('Tęsti');

    await waitFor(() => expect(currentPath()).toBe('/'));
    expect(getSettings(app.db)).toMatchObject({ language: 'lt', biometricsOn: false });
    expect(testRouter.canGoBack()).toBe(false);
  });

  it('Not now leaves biometrics off; a failed check keeps O5 open', async () => {
    const app = await startFirstLaunch();
    await screen.findByText('Continue');
    await press('Continue');
    await typePin('2580');
    await waitFor(() => expect(currentPath()).toBe('/confirm-pin'));
    await typePin('2580');
    await waitFor(() => expect(currentPath()).toBe('/recovery'));
    await fireEvent.press(screen.getByRole('radio', { name: 'In which city were you born?' }));
    await fireEvent.changeText(screen.getByLabelText('Answer'), 'Kaunas');
    await press('Continue');
    await waitFor(() => expect(currentPath()).toBe('/biometrics'));

    auth.authenticateAsync.mockResolvedValueOnce({ success: false } as never);
    await press('Turn on');
    expect(await screen.findByText('Not turned on. Try again, or tap Not now.')).toBeTruthy();
    expect(currentPath()).toBe('/biometrics');

    await press('Not now');
    await waitFor(() => expect(currentPath()).toBe('/'));
    expect(getSettings(app.db).biometricsOn).toBe(false);
  });

  it('Back works on every step after O1', async () => {
    await startFirstLaunch();
    await screen.findByText('Continue');
    await press('Continue');
    await waitFor(() => expect(currentPath()).toBe('/create-pin'));
    await press('Back');
    await waitFor(() => expect(currentPath()).toBe('/welcome'));

    await press('Continue');
    await typePin('2580');
    await waitFor(() => expect(currentPath()).toBe('/confirm-pin'));
    await press('Back');
    await waitFor(() => expect(currentPath()).toBe('/create-pin'));
    // Back on O2 starts with empty dots.
    expect(screen.getAllByLabelText('0 of 4 digits entered').length).toBeGreaterThan(0);

    await typePin('2580');
    await waitFor(() => expect(currentPath()).toBe('/confirm-pin'));
    await typePin('2580');
    await waitFor(() => expect(currentPath()).toBe('/recovery'));
    await press('Back');
    await waitFor(() => expect(currentPath()).toBe('/confirm-pin'));
  });

  it('a link into onboarding after setup goes to Today', async () => {
    const app = setupTestApp();
    saveSettings(app.db, { language: 'en' });
    mockSecure.set('pin', JSON.stringify({ salt: 'a', hash: 'b' }));
    await launch(app, '/create-pin');
    await waitFor(() => expect(currentPath()).toBe('/'));
  });

  it('a settings row without a PIN goes to onboarding', async () => {
    const app = setupTestApp();
    saveSettings(app.db, { language: 'en' });
    await launch(app, '/');
    await waitFor(() => expect(currentPath()).toBe('/welcome'));
  });

  it('opening O3 without a PIN from O2 starts again at O1', async () => {
    const app = setupTestApp();
    await launch(app, '/confirm-pin');
    await waitFor(() => expect(currentPath()).toBe('/welcome'));
    await act(async () => {});
  });
});

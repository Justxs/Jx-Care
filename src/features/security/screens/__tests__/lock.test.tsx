import { PortalHost } from '@rn-primitives/portal';
import { render } from '@testing-library/react-native';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { Slot, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import * as schema from '@/db/schema';
import { gateStore } from '@/features/onboarding/gate';
import { getSettings, hasSettingsRow, saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { lockStore, setLocked, setPendingUrl } from '@/state/lock';
import { setupTestApp } from '@/test/render';

import { LockGate } from '../../components/LockGate';
import { PrivacyOverlay } from '../../components/PrivacyOverlay';
import { ResetDialog } from '../../components/ResetDialog';
import { privacyStore } from '../../lock';
import { pinService } from '../../pin';

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

jest.mock('expo-file-system', () => {
  class Directory {
    exists = false;
    delete() {}
  }
  return { Directory, File: jest.fn(), Paths: { document: 'file:///documents/' } };
});

const auth = jest.mocked(LocalAuthentication);

/** The root layout in short: the app's screens with the lock layer above them. */
function RootLayout() {
  return (
    <LockGate ready>
      <Slot />
      <PortalHost />
    </LockGate>
  );
}

/** A screen with state of its own, to see that unlocking keeps it. */
function TodayStub() {
  const [count, setCount] = useState(0);
  return (
    <View>
      <Text>Today stub</Text>
      <Pressable accessibilityRole="button" onPress={() => setCount((c) => c + 1)}>
        <Text>Tapped {count}</Text>
      </Pressable>
    </View>
  );
}

function ProductStub() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Text>Product {id}</Text>;
}

const routes = {
  _layout: RootLayout,
  index: TodayStub,
  'products/[id]': ProductStub,
  welcome: () => <Text>Welcome stub</Text>,
};

let currentPath: () => string = () => '';

async function launch(app: ReturnType<typeof setupTestApp>, url = '/') {
  app.client.setQueryData(['settings'], getSettings(app.db));
  const result = renderRouter(routes, { initialUrl: url, wrapper: app.wrapper });
  currentPath = () => result.getPathname();
  await result;
  return result;
}

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

/** Presses keys on the PinPad on top. */
async function typePin(pin: string) {
  for (const digit of pin) {
    const keys = screen.getAllByRole('button', { name: digit });
    await fireEvent.press(keys[keys.length - 1]!);
  }
}

async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(async () => {
  await setI18nLanguage('en');
  mockSecure.clear();
  gateStore.setState(() => ({ pinMissing: false }));
  lockStore.setState(() => ({ locked: true, lastBackgroundAt: null, pendingUrl: null }));
  jest.clearAllMocks();
  auth.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' } as never);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('L1 lock screen', () => {
  it('shows on a cold start, over the app, and unlocks with the PIN', async () => {
    const app = await setUp();
    await launch(app);
    expect(await screen.findByText('Enter PIN')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Forgot PIN?' })).toBeTruthy();
    // The app underneath is mounted (Today paints at once) but hidden from screen readers.
    expect(screen.queryByText('Today stub')).toBeNull();
    expect(screen.getByText('Today stub', { includeHiddenElements: true })).toBeTruthy();
    // No biometrics key while biometrics are off.
    expect(screen.queryByRole('button', { name: 'Unlock with Face ID or fingerprint' })).toBeNull();
    expect(auth.authenticateAsync).not.toHaveBeenCalled();

    await typePin('2580');
    await waitFor(() => expect(lockStore.state.locked).toBe(false));
    expect(screen.queryByText('Enter PIN')).toBeNull();
    expect(screen.getByText('Today stub')).toBeTruthy();
  });

  it('does not show while onboarding runs', async () => {
    const app = setupTestApp();
    await launch(app);
    expect(hasSettingsRow(app.db)).toBe(false);
    expect(screen.queryByText('Enter PIN')).toBeNull();
    expect(screen.getByText('Today stub')).toBeTruthy();
  });

  it('returns to the screen the person left, with its state', async () => {
    const app = await setUp();
    lockStore.setState((s) => ({ ...s, locked: false }));
    await launch(app, '/products/7');
    expect(screen.getByText('Product 7')).toBeTruthy();
    await act(async () => setLocked(true));
    expect(await screen.findByText('Enter PIN')).toBeTruthy();
    await typePin('2580');
    await waitFor(() => expect(lockStore.state.locked).toBe(false));
    expect(currentPath()).toBe('/products/7');
    expect(screen.getByText('Product 7')).toBeTruthy();
  });

  it('keeps local screen state across a lock', async () => {
    const app = await setUp();
    lockStore.setState((s) => ({ ...s, locked: false }));
    await launch(app);
    await fireEvent.press(screen.getByRole('button', { name: 'Tapped 0' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Tapped 1' }));
    await act(async () => setLocked(true));
    await typePin('2580');
    await waitFor(() => expect(lockStore.state.locked).toBe(false));
    expect(screen.getByRole('button', { name: 'Tapped 2' })).toBeTruthy();
  });

  it('shakes on a wrong PIN and says so until the next digit', async () => {
    const app = await setUp();
    await launch(app);
    await typePin('1111');
    expect(await screen.findByText('Wrong PIN. Try again.')).toBeTruthy();
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('0 of 4 digits entered')).toBeTruthy();
    expect(lockStore.state.locked).toBe(true);
    await typePin('2');
    expect(screen.queryByText('Wrong PIN. Try again.')).toBeNull();
  });

  it('locks the keypad for 30 s after the 5th wrong PIN and 5 min after the 10th', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-07T10:00:00Z'), advanceTimers: true });
    const app = await setUp();
    await launch(app);
    for (let i = 0; i < 5; i++) {
      await typePin('1111');
      await settle();
    }
    expect(await screen.findByText('Try again in 30 s')).toBeTruthy();
    expect(screen.getByRole('button', { name: '5' })).toBeDisabled();
    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    expect(screen.getByText('Try again in 20 s')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(20_000);
    });
    expect(screen.queryByText(/Try again in/)).toBeNull();
    expect(screen.getByRole('button', { name: '5' })).toBeEnabled();

    for (let i = 0; i < 5; i++) {
      await typePin('1111');
      await settle();
    }
    expect(await screen.findByText('Try again in 5:00')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(61_000);
    });
    expect(screen.getByText('Try again in 3:59')).toBeTruthy();
  });

  it('computes the countdown from the lockout end, so time away is counted', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-07T10:00:00Z'), advanceTimers: true });
    const app = await setUp();
    await launch(app);
    for (let i = 0; i < 5; i++) {
      await typePin('1111');
      await settle();
    }
    expect(await screen.findByText('Try again in 30 s')).toBeTruthy();

    // Twelve seconds pass while no timer runs (the app in the background), then one tick.
    jest.setSystemTime(Date.now() + 12_000);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('Try again in 17 s')).toBeTruthy();
    expect(screen.getByRole('button', { name: '5' })).toBeDisabled();
  });

  it('reads a running lockout when the lock screen opens', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-07T10:00:00Z'), advanceTimers: true });
    const app = await setUp();
    for (let i = 0; i < 5; i++) await pinService.verifyPin('1111', Date.now() - 12_000);
    await launch(app);
    expect(await screen.findByText('Try again in 18 s')).toBeTruthy();
    expect(screen.getByRole('button', { name: '5' })).toBeDisabled();
  });

  it('opens the biometrics prompt once on arrival, then only from the key', async () => {
    const app = await setUp({ biometricsOn: true });
    await launch(app);
    await waitFor(() => expect(auth.authenticateAsync).toHaveBeenCalledTimes(1));
    expect(auth.authenticateAsync.mock.calls[0]![0]).toMatchObject({
      promptMessage: 'Unlock Jx-Care',
      disableDeviceFallback: true,
    });
    // Cancelled: still locked, and no second prompt by itself.
    await settle();
    expect(lockStore.state.locked).toBe(true);
    expect(auth.authenticateAsync).toHaveBeenCalledTimes(1);

    auth.authenticateAsync.mockResolvedValueOnce({ success: true } as never);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Unlock with Face ID or fingerprint' }),
    );
    await waitFor(() => expect(lockStore.state.locked).toBe(false));
    expect(auth.authenticateAsync).toHaveBeenCalledTimes(2);
  });

  it('starts the wrong-PIN count again after a biometrics unlock', async () => {
    const app = await setUp({ biometricsOn: true });
    await launch(app);
    await waitFor(() => expect(auth.authenticateAsync).toHaveBeenCalledTimes(1));
    await settle();
    for (let i = 0; i < 4; i++) await typePin('1111');
    auth.authenticateAsync.mockResolvedValueOnce({ success: true } as never);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Unlock with Face ID or fingerprint' }),
    );
    await waitFor(() => expect(lockStore.state.locked).toBe(false));
    // One wrong PIN later is the first in a row, not the 5th.
    expect(await pinService.verifyPin('1111', Date.now())).toEqual({
      ok: false,
      locked: false,
      failures: 1,
    });
  });

  it('opens a notification tapped while locked right after unlock', async () => {
    const app = await setUp();
    await launch(app);
    await act(async () => setPendingUrl('/products/12'));
    // Still on the same screen behind the lock.
    expect(currentPath()).toBe('/');
    await typePin('2580');
    await waitFor(() => expect(currentPath()).toBe('/products/12'));
    expect(screen.getByText('Product 12')).toBeTruthy();
    expect(lockStore.state.pendingUrl).toBeNull();
  });
});

async function openForgot() {
  const app = await setUp();
  await launch(app);
  await fireEvent.press(await screen.findByRole('button', { name: 'Forgot PIN?' }));
  expect(await screen.findByText('What was the name of your first pet?')).toBeTruthy();
  return app;
}

describe('L2 forgot PIN', () => {
  it('hides the answer as typed, with the eye to show it', async () => {
    await openForgot();
    expect(screen.getByLabelText('Answer').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Show answer' }));
    expect(screen.getByLabelText('Answer').props.secureTextEntry).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Hide answer' }));
    expect(screen.getByLabelText('Answer').props.secureTextEntry).toBe(true);
  });

  it('goes back to the lock screen', async () => {
    await openForgot();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(screen.queryByText('What was the name of your first pet?')).toBeNull();
    expect(screen.getByText('Enter PIN')).toBeTruthy();
  });

  it('sets a new PIN after the right answer and unlocks on Today', async () => {
    const app = await setUp();
    lockStore.setState((s) => ({ ...s, locked: false }));
    await launch(app, '/products/3');
    await act(async () => setLocked(true));
    await fireEvent.press(await screen.findByRole('button', { name: 'Forgot PIN?' }));
    await screen.findByText('What was the name of your first pet?');

    // Case, accents and spaces don't matter.
    await fireEvent.changeText(screen.getByLabelText('Answer'), '  rËx ');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Create a new PIN')).toBeTruthy();
    await typePin('1234');
    expect(screen.getByText('1234 is too easy to guess. Try another.')).toBeTruthy();
    await typePin('1357');
    expect(await screen.findByText('Enter it again')).toBeTruthy();
    await typePin('1357');

    await waitFor(() => expect(lockStore.state.locked).toBe(false));
    await waitFor(() => expect(currentPath()).toBe('/'));
    expect(screen.getByText('Today stub')).toBeTruthy();
    expect((await pinService.verifyPin('1357', Date.now())).ok).toBe(true);
    expect((await pinService.verifyPin('2580', Date.now())).ok).toBe(false);
  });

  it('sends a mismatched new PIN back to step one', async () => {
    await openForgot();
    await fireEvent.changeText(screen.getByLabelText('Answer'), 'Rex');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByText('Create a new PIN');
    await typePin('1357');
    await screen.findByText('Enter it again');
    await typePin('1358');
    expect(screen.getByText("PINs don't match")).toBeTruthy();
    expect(await screen.findByText('Create a new PIN', {}, { timeout: 2000 })).toBeTruthy();
    expect(lockStore.state.locked).toBe(true);
  });

  it('locks the answer field for 15 min after 5 wrong answers', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-07T10:00:00Z'), advanceTimers: true });
    await openForgot();
    for (let i = 0; i < 4; i++) {
      await fireEvent.changeText(screen.getByLabelText('Answer'), 'Max');
      await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
      expect(
        await screen.findByText("That answer doesn't match. Check it and try again."),
      ).toBeTruthy();
    }
    await fireEvent.changeText(screen.getByLabelText('Answer'), 'Max');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Try again in 15:00')).toBeTruthy();
    expect(screen.getByLabelText('Answer').props.editable).toBe(false);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(screen.getByText('Try again in 14:00')).toBeTruthy();
    // The reset link stays available.
    expect(screen.getByRole('button', { name: 'Reset app and delete all data' })).toBeEnabled();
  });

  it('resets the app from the dialog with real counts, after typing RESET', async () => {
    const app = await openForgot();
    app.db
      .insert(schema.product)
      .values([
        { name: 'Serum', area: 'skin' },
        { name: 'Toner', area: 'skin' },
      ])
      .run();
    app.db.insert(schema.routine).values({ name: 'Evening', timeOfDay: 'evening' }).run();

    await fireEvent.press(screen.getByRole('button', { name: 'Reset app and delete all data' }));
    expect(await screen.findByText('Reset app and delete all data?')).toBeTruthy();
    expect(
      screen.getByText(
        "This deletes 2 products, 1 routine and 0 progress photos. This can't be undone.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Export backup' })).toBeNull();
    const action = screen.getByRole('button', { name: 'Reset app' });
    expect(action).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Type RESET to confirm'), 'RESET');
    await fireEvent.press(screen.getByRole('button', { name: 'Reset app' }));

    await waitFor(() => expect(currentPath()).toBe('/welcome'));
    expect(hasSettingsRow(app.db)).toBe(false);
    expect(app.db.select().from(schema.product).all()).toHaveLength(0);
    expect(mockSecure.size).toBe(0);
    expect(gateStore.state.pinMissing).toBe(true);
    await waitFor(() => expect(screen.queryByText('Enter PIN')).toBeNull());
    expect(screen.getByText('Welcome stub')).toBeTruthy();
  });
});

function SettingsStub({ onExport, reset }: { onExport: () => void; reset: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)}>
        <Text>Open reset</Text>
      </Pressable>
      <ResetDialog
        open={open}
        onOpenChange={setOpen}
        fromSettings
        onExport={onExport}
        reset={reset}
      />
      <PortalHost />
    </View>
  );
}

describe('ResetDialog from Settings', () => {
  it('asks for the PIN first, then shows Export backup above Reset app', async () => {
    const app = await setUp();
    app.db.insert(schema.product).values({ name: 'Serum', area: 'skin' }).run();
    const onExport = jest.fn();
    const reset = jest.fn(async () => {});
    await app.render(<SettingsStub onExport={onExport} reset={reset} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Open reset' }));
    expect(await screen.findByText('Enter your PIN')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('PIN'), '1111');
    expect(await screen.findByText('Wrong PIN. Try again.')).toBeTruthy();
    expect(screen.queryByText('Reset app and delete all data?')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('PIN'), '2580');
    expect(await screen.findByText('Reset app and delete all data?')).toBeTruthy();
    expect(
      screen.getByText(
        "This deletes 1 product, 0 routines and 0 progress photos. This can't be undone.",
      ),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Export backup' }));
    expect(onExport).toHaveBeenCalledTimes(1);

    await fireEvent.changeText(screen.getByLabelText('Type RESET to confirm'), 'reset');
    expect(screen.getByRole('button', { name: 'Reset app' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Type RESET to confirm'), 'RESET');
    await fireEvent.press(screen.getByRole('button', { name: 'Reset app' }));
    await waitFor(() => expect(reset).toHaveBeenCalledTimes(1));

    // Opening again asks for the PIN again.
    await fireEvent.press(screen.getByRole('button', { name: 'Open reset' }));
    expect(await screen.findByText('Enter your PIN')).toBeTruthy();
  });

  it('ignores a PIN check that finishes after Cancel, even when opened again', async () => {
    const app = await setUp();
    let finish: (() => void) | undefined;
    const verify = jest.spyOn(pinService, 'verifyPin').mockImplementation(
      () =>
        new Promise((done) => {
          finish = () => done({ ok: true });
        }),
    );
    await app.render(<SettingsStub onExport={jest.fn()} reset={jest.fn(async () => {})} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Open reset' }));
    await fireEvent.changeText(await screen.findByLabelText('PIN'), '2580');
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    // Opened again before the first check finishes.
    await fireEvent.press(screen.getByRole('button', { name: 'Open reset' }));
    await act(async () => finish?.());
    verify.mockRestore();
    expect(screen.getByText('Enter your PIN')).toBeTruthy();
    expect(screen.queryByText('Reset app and delete all data?')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Open reset' }));
    expect(await screen.findByText('Enter your PIN')).toBeTruthy();
    expect(screen.queryByText('Reset app and delete all data?')).toBeNull();
  });
});

describe('PrivacyOverlay', () => {
  it('covers the app with the logo only while inactive or in the background', async () => {
    privacyStore.setState(() => ({ covered: false }));
    await render(<PrivacyOverlay />);
    expect(screen.queryByTestId('privacy-overlay', { includeHiddenElements: true })).toBeNull();
    await act(async () => privacyStore.setState(() => ({ covered: true })));
    expect(screen.getByTestId('privacy-overlay', { includeHiddenElements: true })).toBeTruthy();
    await act(async () => privacyStore.setState(() => ({ covered: false })));
    expect(screen.queryByTestId('privacy-overlay', { includeHiddenElements: true })).toBeNull();
  });
});

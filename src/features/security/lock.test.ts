import type { AppStateStatus } from 'react-native';

import { setNavigator } from '@/notifications/responses';
import { lockStore, setPendingUrl } from '@/state/lock';

import {
  PAUSED_GRACE_MS,
  pauseAutoLock,
  privacyStore,
  resetAutoLockPauses,
  shouldLockOnReturn,
  startAutoLock,
  unlock,
} from './lock';

const mockNavigate = jest.fn();
setNavigator(mockNavigate);

/** A stand-in for React Native's AppState that the test drives. */
function fakeAppState(initial: AppStateStatus = 'active') {
  let listener: ((s: AppStateStatus) => void) | null = null;
  const appState = {
    currentState: initial as AppStateStatus | null,
    addEventListener: (_type: 'change', fn: (s: AppStateStatus) => void) => {
      listener = fn;
      return {
        remove: () => {
          listener = null;
        },
      };
    },
  };
  const go = (state: AppStateStatus) => {
    appState.currentState = state;
    listener?.(state);
  };
  return { appState, go, listening: () => listener !== null };
}

describe('shouldLockOnReturn', () => {
  it('locks at or after the auto-lock time, not before', () => {
    expect(shouldLockOnReturn(1000, 1000 + 59_999, 60)).toBe(false);
    expect(shouldLockOnReturn(1000, 1000 + 60_000, 60)).toBe(true);
    expect(shouldLockOnReturn(1000, 1000 + 299_000, 300)).toBe(false);
    expect(shouldLockOnReturn(1000, 1000 + 300_000, 300)).toBe(true);
  });

  it('locks at once with Immediately (0)', () => {
    expect(shouldLockOnReturn(1000, 1000, 0)).toBe(true);
  });

  it('never locks without a time in the background', () => {
    expect(shouldLockOnReturn(null, 10_000_000, 0)).toBe(false);
  });

  it('waits at least the grace time while paused for a phone screen', () => {
    expect(shouldLockOnReturn(0, 120_000, 0, true)).toBe(false);
    expect(shouldLockOnReturn(0, PAUSED_GRACE_MS, 0, true)).toBe(true);
  });
});

describe('startAutoLock', () => {
  let autoLock = 60;
  let onboarding = false;
  let stop: (() => void) | undefined;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-10-07T10:00:00Z') });
    lockStore.setState(() => ({ locked: false, lastBackgroundAt: null, pendingUrl: null }));
    privacyStore.setState(() => ({ covered: false }));
    resetAutoLockPauses();
    autoLock = 60;
    onboarding = false;
    mockNavigate.mockClear();
  });

  afterEach(() => {
    stop?.();
    jest.useRealTimers();
  });

  function start(initial: AppStateStatus = 'active') {
    const fake = fakeAppState(initial);
    stop = startAutoLock({
      autoLockSeconds: () => autoLock,
      onboarding: () => onboarding,
      appState: fake.appState,
    });
    return fake;
  }

  it('locks again after more than the auto-lock time away', () => {
    const { go } = start();
    go('background');
    jest.advanceTimersByTime(61_000);
    go('active');
    expect(lockStore.state.locked).toBe(true);
    expect(lockStore.state.lastBackgroundAt).toBeNull();
  });

  it('stays unlocked after less than the auto-lock time away', () => {
    const { go } = start();
    go('background');
    jest.advanceTimersByTime(59_000);
    go('active');
    expect(lockStore.state.locked).toBe(false);
  });

  it('follows the auto-lock setting: Immediately and 5 min', () => {
    autoLock = 0;
    const { go } = start();
    go('background');
    jest.advanceTimersByTime(1000);
    go('active');
    expect(lockStore.state.locked).toBe(true);

    lockStore.setState((s) => ({ ...s, locked: false }));
    autoLock = 300;
    go('background');
    jest.advanceTimersByTime(4 * 60_000);
    go('active');
    expect(lockStore.state.locked).toBe(false);
    go('background');
    jest.advanceTimersByTime(5 * 60_000);
    go('active');
    expect(lockStore.state.locked).toBe(true);
  });

  it('counts from the first background event when inactive and background repeat', () => {
    const { go } = start();
    go('inactive');
    go('background');
    jest.advanceTimersByTime(40_000);
    go('background');
    jest.advanceTimersByTime(30_000);
    go('active');
    expect(lockStore.state.locked).toBe(true);
  });

  it('does not lock for inactive alone (app switcher, Face ID prompt)', () => {
    autoLock = 0;
    const { go } = start();
    go('inactive');
    jest.advanceTimersByTime(120_000);
    go('active');
    expect(lockStore.state.locked).toBe(false);
  });

  it('never locks while onboarding runs', () => {
    onboarding = true;
    autoLock = 0;
    const { go } = start();
    go('background');
    jest.advanceTimersByTime(600_000);
    go('active');
    expect(lockStore.state.locked).toBe(false);
  });

  it('does not lock for a short trip to the camera while paused', () => {
    autoLock = 0;
    const { go } = start();
    const resume = pauseAutoLock();
    go('background');
    jest.advanceTimersByTime(20_000);
    go('active');
    resume();
    expect(lockStore.state.locked).toBe(false);
    // Once the camera has closed, Immediately applies again.
    go('background');
    go('active');
    expect(lockStore.state.locked).toBe(true);
  });

  it('covers the app while inactive or in the background', () => {
    const { go } = start();
    expect(privacyStore.state.covered).toBe(false);
    go('inactive');
    expect(privacyStore.state.covered).toBe(true);
    go('active');
    expect(privacyStore.state.covered).toBe(false);
    go('background');
    expect(privacyStore.state.covered).toBe(true);
    go('active');
    expect(privacyStore.state.covered).toBe(false);
  });

  it('locks and uncovers in the same update, so content never shows in between', () => {
    const { go } = start();
    const seen: { locked: boolean; covered: boolean }[] = [];
    const sub = privacyStore.subscribe((s) =>
      seen.push({ locked: lockStore.state.locked, covered: s.covered }),
    );
    go('background');
    jest.advanceTimersByTime(61_000);
    go('active');
    sub.unsubscribe();
    expect(seen.at(-1)).toEqual({ locked: true, covered: false });
  });

  it('starts covered when started in the background', () => {
    start('background');
    expect(privacyStore.state.covered).toBe(true);
  });

  it('stops listening', () => {
    const fake = start();
    stop?.();
    expect(fake.listening()).toBe(false);
  });
});

describe('unlock', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('unlocks and opens the screen of a notification tapped while locked, once', () => {
    lockStore.setState(() => ({ locked: true, lastBackgroundAt: null, pendingUrl: null }));
    setPendingUrl('/products/12');
    unlock();
    expect(lockStore.state.locked).toBe(false);
    expect(lockStore.state.pendingUrl).toBeNull();
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/products/12');
  });

  it('just unlocks when nothing is pending', () => {
    lockStore.setState(() => ({ locked: true, lastBackgroundAt: null, pendingUrl: null }));
    unlock();
    expect(lockStore.state.locked).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

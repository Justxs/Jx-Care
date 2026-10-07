import { createStore } from '@tanstack/react-store';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';

import { openPendingUrl } from '@/notifications';
import { lockStore, setLastBackgroundAt, setLocked } from '@/state/lock';

/**
 * When the app locks (spec L1, task 018). The app is locked at launch (`lockStore.locked` starts
 * true); after that it locks again when it comes back from the background after the auto-lock
 * time (Settings, 0 / 60 / 300 s, default 60). The same AppState listener drives the privacy
 * cover, so a lock and the cover going away land in one render and content never flashes.
 */

export type PrivacyState = {
  /** True while the app is inactive or in the background: the app switcher sees the cover. */
  covered: boolean;
};

export const privacyStore = createStore<PrivacyState>({ covered: false });

function setCovered(covered: boolean): void {
  if (privacyStore.state.covered !== covered) privacyStore.setState(() => ({ covered }));
}

/**
 * While a phone screen we opened ourselves is on top (camera or photo picker), coming back
 * doesn't lock before this much time away, even with "Immediately".
 */
export const PAUSED_GRACE_MS = 5 * 60_000;

let pauses = 0;

/**
 * Keeps a short trip to a phone screen the app opened (camera, photo picker) from locking the
 * app. Returns the function that ends the pause; call it when that screen has closed.
 */
export function pauseAutoLock(): () => void {
  pauses += 1;
  let done = false;
  return () => {
    if (done) return;
    done = true;
    pauses = Math.max(0, pauses - 1);
  };
}

/** Runs `task` (which opens a phone screen) with auto-lock paused. */
export async function withAutoLockPaused<T>(task: () => Promise<T>): Promise<T> {
  const resume = pauseAutoLock();
  try {
    return await task();
  } finally {
    resume();
  }
}

/**
 * Whether coming back after `lastBackgroundAt` locks the app. Exactly the auto-lock time away
 * locks; "Immediately" (0) always locks. `paused` raises the bar to `PAUSED_GRACE_MS`.
 */
export function shouldLockOnReturn(
  lastBackgroundAt: number | null,
  now: number,
  autoLockSeconds: number,
  paused = false,
): boolean {
  if (lastBackgroundAt === null) return false;
  const limit = Math.max(autoLockSeconds * 1000, paused ? PAUSED_GRACE_MS : 0);
  return now - lastBackgroundAt >= limit;
}

type AppStateLike = {
  currentState?: AppStateStatus | null;
  addEventListener: (
    type: 'change',
    listener: (state: AppStateStatus) => void,
  ) => Pick<NativeEventSubscription, 'remove'>;
};

export type AutoLockOptions = {
  /** The auto-lock time from settings, read when the app comes back. */
  autoLockSeconds: () => number;
  /** True while onboarding runs: there is no PIN to unlock with yet, so nothing locks. */
  onboarding: () => boolean;
  now?: () => number;
  appState?: AppStateLike;
};

/** Starts the AppState listener that re-locks and covers the app. Returns a stop function. */
export function startAutoLock(opts: AutoLockOptions): () => void {
  const now = opts.now ?? Date.now;
  const appState = opts.appState ?? AppState;
  // Whether a pause was running when the app left. Read then, not on return: Android hands the
  // camera or picker result (which ends the pause) to JS before the app is active again.
  let leftPaused = false;

  const onChange = (state: AppStateStatus) => {
    if (state === 'background') {
      setCovered(true);
      if (pauses > 0) leftPaused = true;
      if (lockStore.state.lastBackgroundAt === null) setLastBackgroundAt(now());
      return;
    }
    if (state === 'inactive') {
      // iOS: app switcher, Control Centre, a system prompt (Face ID). Not time away.
      setCovered(true);
      return;
    }
    if (state !== 'active') return;
    const away = lockStore.state.lastBackgroundAt;
    if (away !== null) {
      setLastBackgroundAt(null);
      const paused = leftPaused || pauses > 0;
      leftPaused = false;
      if (
        !opts.onboarding() &&
        !lockStore.state.locked &&
        shouldLockOnReturn(away, now(), opts.autoLockSeconds(), paused)
      ) {
        setLocked(true);
      }
    }
    setCovered(false);
  };

  const sub = appState.addEventListener('change', onChange);
  if (appState.currentState === 'background' || appState.currentState === 'inactive') {
    setCovered(true);
  }
  return () => sub.remove();
}

/**
 * Unlocks: the lock layer fades out over the screen the person left, then a notification tapped
 * while locked opens its screen (task 020).
 */
export function unlock(): void {
  setLocked(false);
  openPendingUrl();
}

/** Test helper: forget every pause. */
export function resetAutoLockPauses(): void {
  pauses = 0;
}

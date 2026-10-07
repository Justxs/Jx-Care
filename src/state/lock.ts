import { createStore } from '@tanstack/react-store';

export type LockStoreState = {
  /** True at launch; the lock gate (task 018) shows the lock screen while set. */
  locked: boolean;
  /** When the app last went to the background (ms), for auto-lock. */
  lastBackgroundAt: number | null;
  /** A notification tapped while locked: the screen to open right after unlock (task 020). */
  pendingUrl: string | null;
};

export const lockStore = createStore<LockStoreState>({
  locked: true,
  lastBackgroundAt: null,
  pendingUrl: null,
});

export function setLocked(locked: boolean): void {
  lockStore.setState((s) => ({ ...s, locked }));
}

export function setLastBackgroundAt(at: number | null): void {
  lockStore.setState((s) => ({ ...s, lastBackgroundAt: at }));
}

export function setPendingUrl(url: string | null): void {
  lockStore.setState((s) => ({ ...s, pendingUrl: url }));
}

/** Returns the pending URL and clears it, so it is opened only once. */
export function takePendingUrl(): string | null {
  const url = lockStore.state.pendingUrl;
  if (url !== null) setPendingUrl(null);
  return url;
}

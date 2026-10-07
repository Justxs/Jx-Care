import { createStore } from '@tanstack/react-store';

export type LockStoreState = {
  /** True at launch; the lock gate (task 018) shows the lock screen while set. */
  locked: boolean;
  /** When the app last went to the background (ms), for auto-lock. */
  lastBackgroundAt: number | null;
};

export const lockStore = createStore<LockStoreState>({ locked: true, lastBackgroundAt: null });

export function setLocked(locked: boolean): void {
  lockStore.setState((s) => ({ ...s, locked }));
}

export function setLastBackgroundAt(at: number | null): void {
  lockStore.setState((s) => ({ ...s, lastBackgroundAt: at }));
}

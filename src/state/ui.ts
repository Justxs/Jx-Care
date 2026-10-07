import { createStore } from '@tanstack/react-store';
import { AccessibilityInfo } from 'react-native';

export type Toast = {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** A second action before the main one ("Buy again" next to Undo). */
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export type UiStoreState = {
  /** Visible toasts, newest last. A new toast replaces the one on screen. */
  toasts: Toast[];
  /** While a screen reader is on, toasts stay until dismissed or replaced. */
  screenReaderOn: boolean;
  /** Space kept under toasts so they float above the tab bar or the player's timer bar. */
  toastInset: number;
};

export const uiStore = createStore<UiStoreState>({
  toasts: [],
  screenReaderOn: false,
  toastInset: 0,
});

const TOAST_DURATION_MS = 8000;

let nextId = 1;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

export function dismissToast(id: number): void {
  const timer = timers.get(id);
  if (timer) clearTimeout(timer);
  timers.delete(id);
  uiStore.setState((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) }));
}

/** Shows a toast for 8 s (spec); with a screen reader on it stays until dismissed or replaced. */
export function showToast(input: Omit<Toast, 'id'>): number {
  const toast: Toast = { ...input, id: nextId++ };
  for (const old of uiStore.state.toasts) dismissToast(old.id);
  uiStore.setState((s) => ({ ...s, toasts: [...s.toasts, toast] }));
  if (!uiStore.state.screenReaderOn) {
    timers.set(
      toast.id,
      setTimeout(() => dismissToast(toast.id), TOAST_DURATION_MS),
    );
  }
  return toast.id;
}

/** Runs the toast's action (Undo) and removes it. */
export function runToastAction(id: number): void {
  const toast = uiStore.state.toasts.find((t) => t.id === id);
  dismissToast(id);
  toast?.onAction?.();
}

/** Runs the toast's second action (Buy again) and removes it. */
export function runToastSecondary(id: number): void {
  const toast = uiStore.state.toasts.find((t) => t.id === id);
  dismissToast(id);
  toast?.onSecondary?.();
}

/** Screens with a bar at the bottom (tab bar, timer bar) set its height; 0 when it goes away. */
export function setToastInset(px: number): void {
  uiStore.setState((s) => ({ ...s, toastInset: px }));
}

export function setScreenReaderOn(on: boolean): void {
  uiStore.setState((s) => ({ ...s, screenReaderOn: on }));
}

/** Tracks the screen reader so toasts know whether to time out. Returns a stop function. */
export function watchScreenReader(): () => void {
  AccessibilityInfo.isScreenReaderEnabled()
    .then(setScreenReaderOn)
    .catch(() => {});
  const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReaderOn);
  return () => sub.remove();
}

import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { remainingSeconds } from './playerLogic';

/** How often the countdown re-reads the clock; the shown time stays right to the second. */
export const WAIT_TICK_MS = 250;

type Wait = { stepId: number; endsAt: number };

export type WaitTimer = {
  /** The step whose tick started the wait, while one runs. */
  stepId: number | null;
  /** Whole seconds left (0 when no wait runs). */
  remaining: number;
  start: (seconds: number, stepId: number) => void;
  /** Skip wait, or the wait no longer applies (its step was unticked). No haptic. */
  stop: () => void;
};

/**
 * The player's wait between steps (spec T2). It keeps an end timestamp, not a count, so the time
 * is right after the app was in the background: the clock is read again on every tick and as
 * soon as the app is active again. A light haptic marks the end.
 */
export function useWaitTimer(): WaitTimer {
  const [wait, setWait] = useState<Wait | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!wait) return;
    const check = () => {
      const t = Date.now();
      if (t >= wait.endsAt) {
        setWait(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        return;
      }
      setNow(t);
    };
    const timer = setInterval(check, WAIT_TICK_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [wait]);

  const start = useCallback((seconds: number, stepId: number) => {
    const t = Date.now();
    setNow(t);
    setWait(seconds > 0 ? { stepId, endsAt: t + seconds * 1000 } : null);
  }, []);
  const stop = useCallback(() => setWait(null), []);

  return {
    stepId: wait?.stepId ?? null,
    remaining: wait ? remainingSeconds(wait.endsAt, now) : 0,
    start,
    stop,
  };
}

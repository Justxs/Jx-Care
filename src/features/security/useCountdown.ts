import { useEffect, useState } from 'react';
import type { TFunction } from 'i18next';
import { AppState } from 'react-native';

import { formatCountdown } from '@/i18n/format';

/** Whole seconds left until `until` (ms), never below 0. */
export function secondsLeft(until: number, now: number): number {
  return until > now ? Math.ceil((until - now) / 1000) : 0;
}

/**
 * Seconds left in a lockout that ends at `until` (ms; 0 means none), ticking every second.
 * It is computed from the end time, never counted down, so it stays right after the app has
 * been in the background, and it is read again the moment the app comes back.
 */
export function useCountdown(until: number, now: () => number = Date.now): number {
  const [left, setLeft] = useState(() => secondsLeft(until, now()));

  useEffect(() => {
    const update = () => setLeft(secondsLeft(until, now()));
    update();
    if (until <= now()) return undefined;
    const timer = setInterval(update, 1000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [until, now]);

  return left;
}

/** "Try again in 30 s" under a minute, "Try again in 4:59" from a minute up. */
export function tryAgainText(t: TFunction, seconds: number): string {
  return seconds < 60
    ? t('lock.tryAgainSeconds', { seconds })
    : t('lock.tryAgainTime', { time: formatCountdown(seconds) });
}

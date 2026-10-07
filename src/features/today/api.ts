import { queryOptions, useQuery } from '@tanstack/react-query';
import { useSelector } from '@tanstack/react-store';

import { getDb } from '@/db';
import { qk } from '@/db/queryKeys';
import { expiringSoonQuery } from '@/features/products/api';
import { skinStreakQuery, todayRoutinesQuery } from '@/features/routines/api';
import { settingsQuery } from '@/features/settings/api';
import { appStore } from '@/state/app';

import { setupProgress } from './repo';

/** How many products the Expiring soon card lists. */
export const EXPIRING_LIMIT = 3;

/**
 * The first-run card's data. Under the Today key, so product, routine, hair and settings changes
 * (which all invalidate `qk.today.all`) refresh it.
 */
export const setupQuery = (day: string) =>
  queryOptions({
    queryKey: [...qk.today.day(day), 'setup'],
    queryFn: () => setupProgress(getDb()),
  });

/** Every query Today's sections read for `day`, given the expiry warning window. */
export function todayQueries(day: string, warnDays: number) {
  return {
    setup: setupQuery(day),
    routines: todayRoutinesQuery(day, warnDays),
    skinStreak: skinStreakQuery(day),
    expiring: expiringSoonQuery(day, warnDays, EXPIRING_LIMIT),
  };
}

/**
 * Today (T1): composes the section queries. Each part stays `undefined` until its query is ready,
 * and the screen shows that section's skeleton meanwhile (rare: `prefetchToday` fills them first).
 */
export function useToday() {
  const day = useSelector(appStore, (s) => s.activeDay);
  const settings = useQuery(settingsQuery());
  const q = todayQueries(day, settings.data?.expiryWarnDays ?? 30);
  const setup = useQuery(q.setup);
  const routines = useQuery(q.routines);
  const skinStreak = useQuery(q.skinStreak);
  const expiring = useQuery(q.expiring);
  return {
    day,
    settings: settings.data,
    setup: setup.data,
    groups: routines.data,
    skinStreak: skinStreak.data,
    expiring: expiring.data,
    anyExpired: expiring.data?.some((p) => p.status === 'expired') ?? false,
  };
}

export type TodayData = ReturnType<typeof useToday>;

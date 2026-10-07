import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from '@tanstack/react-store';
import { useCallback, useEffect } from 'react';

import { getDb } from '@/db';
import { qk } from '@/db/queryKeys';
import {
  applyTickToRoutine,
  useSkinStreak,
  useTickStep,
  type TickVars,
} from '@/features/routines/api';
import { useSettings } from '@/features/settings/api';
import { appStore } from '@/state/app';

import { gridDays, shiftMonth } from './month';
import { getSkinDay, getSkinMonth, type SkinDay } from './repo';

const useToday = () => useSelector(appStore, (s) => s.activeDay);

/** Under `qk.calendar`, so routine and tick mutations (which invalidate it) refresh them. */
export const calendarKeys = {
  skinMonth: (month: string, today: string) =>
    [...qk.calendar.month('skin', month), today] as const,
  skinDayAll: (day: string) => [...qk.calendar.day(day), 'skin'] as const,
  skinDay: (day: string, today: string, warnDays: number) =>
    [...qk.calendar.day(day), 'skin', today, warnDays] as const,
};

function skinMonthQuery(month: string, today: string) {
  return {
    queryKey: calendarKeys.skinMonth(month, today),
    queryFn: () => getSkinMonth(getDb(), gridDays(month), today),
  };
}

/**
 * C1 Skin view: statuses for the 42 grid days of `month` ('YYYY-MM') from one query, so the
 * grid paints in one go. The months either side are prefetched for the swipe.
 */
export function useSkinMonth(month: string) {
  const today = useToday();
  const client = useQueryClient();
  useEffect(() => {
    for (const n of [-1, 1]) {
      client.prefetchQuery(skinMonthQuery(shiftMonth(month, n), today)).catch(() => {});
    }
  }, [client, month, today]);
  return useQuery({ ...skinMonthQuery(month, today), placeholderData: keepPreviousData });
}

export type SkinStreakCard = { current: number; best: number; restarted: boolean };

/**
 * The skin StreakCard values (task 007 `skinStreak`). `restarted` once a longer run ended
 * before the current one, so the card reads "Started again. Your best is still 21 days."
 */
export function useSkinStreakCard(): SkinStreakCard | undefined {
  const streak = useSkinStreak().data;
  if (!streak) return undefined;
  return { ...streak, restarted: streak.best > streak.current };
}

/** C2 Skin routines on a day, with what was ticked. */
export function useSkinDay(day: string) {
  const today = useToday();
  const warnDays = useSettings().data?.expiryWarnDays ?? 30;
  return useQuery({
    queryKey: calendarKeys.skinDay(day, today, warnDays),
    queryFn: () => getSkinDay(getDb(), day, today, warnDays),
  });
}

/** A day as it will be once a tick is saved (the optimistic C2 update). */
export function applyTickToDay(d: SkinDay, v: TickVars): SkinDay {
  if (d.day !== v.day) return d;
  return {
    ...d,
    groups: d.groups.map((g) => ({
      ...g,
      routines: g.routines.map((r) => applyTickToRoutine(r, v)),
    })),
  };
}

/**
 * Ticks a forgotten step on a past day (C2) through `useTickStep`, so the marks and the streak
 * refresh with Today's. The day's checkbox fills at once and rolls back if saving fails.
 */
export function useTickDayStep() {
  const client = useQueryClient();
  const { mutate } = useTickStep();
  return useCallback(
    (v: TickVars) => {
      const filter = { queryKey: calendarKeys.skinDayAll(v.day) };
      const previous = client.getQueriesData<SkinDay>(filter);
      client.setQueriesData<SkinDay>(filter, (d) => (d ? applyTickToDay(d, v) : d));
      mutate(v, {
        onError: () => {
          for (const [key, data] of previous) client.setQueryData(key, data);
        },
      });
    },
    [client, mutate],
  );
}

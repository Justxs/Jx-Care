import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { useSelector } from '@tanstack/react-store';
import { useTranslation } from 'react-i18next';

import { getDb } from '@/db';
import { qk } from '@/db/queryKeys';
import type { RoutineLog } from '@/db/schema';
import { useSettings } from '@/features/settings/api';
import { skinStreak } from '@/lib/streak';
import { appStore } from '@/state/app';

import {
  dayRoutine,
  deleteRoutine,
  duplicateRoutine,
  getRoutine,
  getRoutineDay,
  getTodayRoutines,
  groupDayRoutines,
  listRoutines,
  nextDoneIds,
  recentStepProducts,
  replaceStepProduct,
  saveRoutine,
  setChoice,
  setRoutineActive,
  streakInput,
  tickSteps,
  type DayRoutine,
  type SaveRoutineInput,
  type TodayRoutineGroup,
} from './repo';

/**
 * Called whenever a routine is created, changed, switched on or off, duplicated or deleted.
 * Task 027 reschedules its reminders here and task 030 refreshes its conflict cache. Does
 * nothing yet.
 */
export function onRoutineChanged(_id: number): void {}

/**
 * Called when the reminder switch in the routine editor is turned on. Task 021 calls its
 * `askForReminders()` here, which asks for the notification permission the first time ever
 * (refinement 8). Does nothing yet.
 */
export function onRoutineReminderSwitchedOn(): void {}

/** The app day and expiry window that step product statuses depend on; part of each key. */
function useDayContext() {
  const day = useSelector(appStore, (s) => s.activeDay);
  const warnDays = useSettings().data?.expiryWarnDays ?? 30;
  return { day, warnDays };
}

const todayRoutinesKey = (day: string) => [...qk.today(day), 'routines'] as const;

/** Today's routine cards on `day`; shared by `useTodayRoutines` and Today's prefetch. */
export const todayRoutinesQuery = (day: string, warnDays: number) =>
  queryOptions({
    queryKey: [...todayRoutinesKey(day), warnDays],
    queryFn: () => getTodayRoutines(getDb(), day, warnDays),
  });

/** Current and best skin streak; shared by `useSkinStreak` and Today's prefetch. */
export const skinStreakQuery = (day: string) =>
  queryOptions({
    queryKey: [...qk.calendar.streaks, 'skin', day],
    queryFn: () => skinStreak(streakInput(getDb(), day)),
  });

// ─── Reads ──────────────────────────────────────────────────────────────────

export function useRoutines() {
  const { day, warnDays } = useDayContext();
  return useQuery({
    queryKey: [...qk.routines.list, day, warnDays],
    queryFn: () => listRoutines(getDb(), day, warnDays),
  });
}

export function useRoutine(id: number) {
  const { day, warnDays } = useDayContext();
  return useQuery({
    queryKey: [...qk.routines.detail(id), day, warnDays],
    queryFn: () => getRoutine(getDb(), id, day, warnDays),
  });
}

/** Today's routine cards, keyed by the app day. */
export function useTodayRoutines() {
  const { day, warnDays } = useDayContext();
  return useQuery(todayRoutinesQuery(day, warnDays));
}

/** One routine on the current app day, for the player (T2). */
export function useRoutineDay(id: number) {
  const { day, warnDays } = useDayContext();
  return useQuery({
    queryKey: [...qk.routines.player(id, day), warnDays],
    queryFn: () => getRoutineDay(getDb(), id, day, warnDays),
  });
}

export function useSkinStreak() {
  const day = useSelector(appStore, (s) => s.activeDay);
  return useQuery(skinStreakQuery(day));
}

/** The R4 picker's Recent group. */
export function useRecentStepProducts(area: 'skin' | 'hair') {
  const { day, warnDays } = useDayContext();
  return useQuery({
    queryKey: [...qk.routines.all, 'recentProducts', area, day, warnDays],
    queryFn: () => recentStepProducts(getDb(), area, day, warnDays),
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

function invalidate(client: QueryClient, opts: { products?: boolean } = {}): void {
  client.invalidateQueries({ queryKey: qk.routines.all });
  client.invalidateQueries({ queryKey: ['today'] });
  client.invalidateQueries({ queryKey: qk.calendar.all });
  // Product detail lists the routines a product is used in.
  if (opts.products) client.invalidateQueries({ queryKey: qk.products.all });
}

export function useSaveRoutine() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveRoutineInput) => saveRoutine(getDb(), input),
    onSuccess: (id) => {
      invalidate(client, { products: true });
      onRoutineChanged(id);
    },
  });
}

export function useSetRoutineActive() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      setRoutineActive(getDb(), id, active);
      return id;
    },
    onSuccess: (id) => {
      invalidate(client);
      onRoutineChanged(id);
    },
  });
}

/** "Duplicate as variant": the copy is named "<name> (copy)" in the app language. */
export function useDuplicateRoutine() {
  const client = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (id: number) =>
      duplicateRoutine(getDb(), id, (name) => t('routines.copyName', { name })),
    onSuccess: (id) => {
      invalidate(client, { products: true });
      onRoutineChanged(id);
    },
  });
}

export function useDeleteRoutine() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      deleteRoutine(getDb(), id);
      return id;
    },
    onSuccess: (id) => {
      client.removeQueries({ queryKey: qk.routines.detail(id) });
      invalidate(client, { products: true });
      onRoutineChanged(id);
    },
  });
}

export function useReplaceStepProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ stepId, productId }: { stepId: number; productId: number | null }) =>
      replaceStepProduct(getDb(), stepId, productId),
    onSuccess: (routineId) => {
      invalidate(client, { products: true });
      if (routineId !== null) onRoutineChanged(routineId);
    },
  });
}

export function useSetChoice() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (v: { timeOfDayKey: string; weekday: number; routineId: number }) =>
      setChoice(getDb(), v.timeOfDayKey, v.weekday, v.routineId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['today'] });
    },
  });
}

// ─── Ticks (optimistic) ─────────────────────────────────────────────────────

export type TickVars = {
  routineId: number;
  /** One step from the player; every remaining due step from All done or its Undo. */
  stepIds: number[];
  day: string;
  done: boolean;
  /** The routine's due step ids as shown, saved as the day's snapshot on the first tick. */
  dueStepIds: number[];
};

/** A routine as it will be once the tick is saved. Mirrors `tickSteps` in the repository. */
export function applyTickToRoutine(r: DayRoutine, v: TickVars, now = Date.now()): DayRoutine {
  if (r.id !== v.routineId) return r;
  if (!r.log && !v.done) return r;
  const doneStepIds = nextDoneIds(r.log?.doneStepIds ?? [], v.stepIds, v.done);
  const dueStepIds = r.log && r.log.dueStepIds.length > 0 ? r.log.dueStepIds : [...v.dueStepIds];
  const log: RoutineLog = r.log
    ? { ...r.log, doneStepIds, dueStepIds }
    : {
        id: -1,
        routineId: r.id,
        day: v.day,
        dueStepIds,
        doneStepIds,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      };
  const next = dayRoutine(r, log, v.day);
  return {
    ...next,
    log: { ...log, completedAt: next.progress.complete ? (log.completedAt ?? now) : null },
  };
}

export function applyTickToGroups(
  groups: readonly TodayRoutineGroup[],
  v: TickVars,
  now = Date.now(),
): TodayRoutineGroup[] {
  return groups.map((g) =>
    g.routines.some((r) => r.id === v.routineId)
      ? groupDayRoutines([
          {
            key: g.key,
            chosenId: g.chosenId,
            routines: g.routines.map((r) => applyTickToRoutine(r, v, now)),
          },
        ])[0]!
      : g,
  );
}

/**
 * Ticks or unticks steps. The cache changes at once (the checkbox fills with no wait) and rolls
 * back if saving fails.
 */
export function useTickStep() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (v: TickVars) =>
      tickSteps(getDb(), v.routineId, v.stepIds, v.day, v.done, v.dueStepIds),
    onMutate: async (v) => {
      const todayKey = todayRoutinesKey(v.day);
      const playerKey = qk.routines.player(v.routineId, v.day);
      await Promise.all([
        client.cancelQueries({ queryKey: todayKey }),
        client.cancelQueries({ queryKey: playerKey }),
      ]);
      const previous: [QueryKey, unknown][] = [
        ...client.getQueriesData({ queryKey: todayKey }),
        ...client.getQueriesData({ queryKey: playerKey }),
      ];
      client.setQueriesData<TodayRoutineGroup[]>({ queryKey: todayKey }, (groups) =>
        groups ? applyTickToGroups(groups, v) : groups,
      );
      client.setQueriesData<DayRoutine | null>({ queryKey: playerKey }, (r) =>
        r ? applyTickToRoutine(r, v) : r,
      );
      return { previous };
    },
    onError: (_error, _v, context) => {
      for (const [key, data] of context?.previous ?? []) client.setQueryData(key, data);
    },
    onSettled: (_log, _error, v) => {
      client.invalidateQueries({ queryKey: qk.today(v.day) });
      client.invalidateQueries({ queryKey: qk.routines.all });
      client.invalidateQueries({ queryKey: qk.calendar.all });
    },
  });
}

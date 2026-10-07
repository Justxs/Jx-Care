import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useSelector } from '@tanstack/react-store';

import { getDb } from '@/db';
import { qk } from '@/db/queryKeys';
import { i18n } from '@/i18n';
import { daysInMonthGrid } from '@/lib/appDay';
import { hairStreak } from '@/lib/hair';
import { cancelSnoozes, syncEntity } from '@/notifications';
import { appStore } from '@/state/app';

import {
  deleteHairLog,
  deleteHairTask,
  getHairTask,
  hairDueToday,
  hairLogsOnDay,
  hairMonth,
  hairStreakInput,
  hasAnyHairTask,
  hasWashTask,
  listHairTasks,
  markHairDone,
  quickSetup,
  saveHairTask,
  setHairTaskActive,
  washDueOn,
  type MarkHairDone,
  type QuickHairSetup,
} from './repo';
import type { HairTaskInput } from './schema';

/**
 * Re-plans a task's reminder (task 033) whenever it is created, changed, marked done or deleted.
 * Fire and forget: a failure is picked up by the next full sync.
 */
export function onHairTaskChanged(id: number): void {
  syncEntity('hair_task', id).catch(() => {});
}

const useToday = () => useSelector(appStore, (s) => s.activeDay);

export const hairKeys = {
  tasks: (today: string) => [...qk.hair.tasks, today] as const,
  any: [...qk.hair.all, 'any'] as const,
  detail: (id: number, today: string) => [...qk.hair.detail(id), today] as const,
  dueToday: (today: string) => [...qk.hair.all, 'dueToday', today] as const,
  streak: (today: string) => [...qk.hair.all, 'streak', today] as const,
  /** Today's chip: the streak, or null while there is no wash task. */
  streakChip: (today: string) => [...qk.hair.all, 'streakChip', today] as const,
  /** Under the calendar keys, so calendar invalidation refreshes the Hair view too. */
  month: (month: string, today: string) => [...qk.calendar.month('hair', month), today] as const,
  day: (day: string) => [...qk.calendar.day(day), 'hair'] as const,
  /** C2 "Next wash was due 6 Oct". */
  dayDue: (day: string, today: string) => [...qk.calendar.day(day), 'hair', 'due', today] as const,
  hasWash: [...qk.hair.all, 'hasWash'] as const,
};

/** Today's "Hair due" rows; shared with `prefetchHair`, so the keys always match. */
export const hairDueTodayQuery = (today: string) =>
  queryOptions({
    queryKey: hairKeys.dueToday(today),
    queryFn: () => hairDueToday(getDb(), today),
  });

/** Today's hair streak chip: washes only, null while there is no active wash task. */
export const hairStreakChipQuery = (today: string) =>
  queryOptions({
    queryKey: hairKeys.streakChip(today),
    queryFn: () => {
      const db = getDb();
      if (!hasWashTask(db)) return null;
      const input = hairStreakInput(db, today);
      return hairStreak(input.tasks, input.logs, input.today);
    },
  });

/** What Today's hair slots read, so Today paints complete (task 025's `prefetchToday`). */
export async function prefetchHair(client: QueryClient, today: string): Promise<void> {
  await Promise.all([
    client.prefetchQuery(hairDueTodayQuery(today)),
    client.prefetchQuery(hairStreakChipQuery(today)),
  ]);
}

export function useHairTasks() {
  const today = useToday();
  return useQuery({
    queryKey: hairKeys.tasks(today),
    queryFn: () => listHairTasks(getDb(), today),
    placeholderData: keepPreviousData,
  });
}

/** True once any hair task exists (Today setup row 3, Hair empty state). */
export function useHasHairTask() {
  return useQuery({ queryKey: hairKeys.any, queryFn: () => hasAnyHairTask(getDb()) });
}

export function useHairTask(id: number) {
  const today = useToday();
  return useQuery({
    queryKey: hairKeys.detail(id, today),
    queryFn: () => getHairTask(getDb(), id, today),
  });
}

export function useHairDueToday() {
  const today = useToday();
  return useQuery(hairDueTodayQuery(today));
}

export function useHairStreakChip() {
  const today = useToday();
  return useQuery(hairStreakChipQuery(today));
}

/** True while an active wash task exists (the hair streak card on the calendar). */
export function useHasWashTask() {
  return useQuery({ queryKey: hairKeys.hasWash, queryFn: () => hasWashTask(getDb()) });
}

/** C2: for a day with nothing done, the wash due day that had come by then (or null). */
export function useWashDueOn(day: string) {
  const today = useToday();
  return useQuery({
    queryKey: hairKeys.dayDue(day, today),
    queryFn: () => washDueOn(getDb(), day),
  });
}

/** C1 Hair view marks for a month (`'YYYY-MM'`), over its 42-day grid. */
export function useHairMonth(month: string) {
  const today = useToday();
  return useQuery({
    queryKey: hairKeys.month(month, today),
    queryFn: () => {
      const [year = 1970, m = 1] = month.split('-').map(Number);
      return hairMonth(getDb(), daysInMonthGrid(year, m), today);
    },
    placeholderData: keepPreviousData,
  });
}

/** Current and best hair streak (washes only). */
export function useHairStreak() {
  const today = useToday();
  return useQuery({
    queryKey: hairKeys.streak(today),
    queryFn: () => {
      const input = hairStreakInput(getDb(), today);
      return hairStreak(input.tasks, input.logs, input.today);
    },
  });
}

export function useHairLogsOnDay(day: string) {
  return useQuery({ queryKey: hairKeys.day(day), queryFn: () => hairLogsOnDay(getDb(), day) });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

function invalidate(client: QueryClient, opts: { usedIn?: boolean } = {}): void {
  client.invalidateQueries({ queryKey: qk.hair.all });
  client.invalidateQueries({ queryKey: ['today'] });
  client.invalidateQueries({ queryKey: qk.calendar.all });
  // C6 hair "What changed this week" counts the logs.
  client.invalidateQueries({ queryKey: qk.progress.all });
  // The R4 picker's Recent hair products follow the tasks' products, latest changed first.
  client.invalidateQueries({ queryKey: [...qk.routines.all, 'recentProducts', 'hair'] });
  if (opts.usedIn) {
    // Product detail shows the hair tasks that use a product (P2 "Used in").
    client.invalidateQueries({ queryKey: [...qk.products.all, 'detail'] });
    client.invalidateQueries({ queryKey: [...qk.products.all, 'usedIn'] });
  }
}

export function useSaveHairTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: number; input: HairTaskInput }) =>
      saveHairTask(getDb(), input, id),
    onSuccess: (id) => {
      invalidate(client, { usedIn: true });
      onHairTaskChanged(id);
    },
  });
}

export function useQuickHairSetup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: QuickHairSetup) =>
      quickSetup(getDb(), input, appStore.state.activeDay, {
        wash: i18n.t('hair.defaultNames.wash'),
        trim: i18n.t('hair.defaultNames.trim'),
      }),
    onSuccess: ({ washId, trimId }) => {
      invalidate(client);
      onHairTaskChanged(washId);
      if (trimId != null) onHairTaskChanged(trimId);
    },
  });
}

/** T3 Mark as done. Resolves to the new next due day for "Next wash: Friday, 9 Oct". */
export function useMarkHairDone() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, ...done }: MarkHairDone & { taskId: number }) => ({
      taskId,
      ...markHairDone(getDb(), taskId, done),
    }),
    onSuccess: ({ taskId }) => {
      invalidate(client);
      // A snoozed copy of today's reminder is no longer needed.
      cancelSnoozes('hair_task', taskId).catch(() => {});
      onHairTaskChanged(taskId);
    },
  });
}

export function useDeleteHairLog() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (logId: number) => deleteHairLog(getDb(), logId),
    onSuccess: (taskId) => {
      invalidate(client);
      if (taskId != null) onHairTaskChanged(taskId);
    },
  });
}

export function useDeleteHairTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      deleteHairTask(getDb(), id);
      return id;
    },
    onSuccess: (id) => {
      client.removeQueries({ queryKey: qk.hair.detail(id) });
      invalidate(client, { usedIn: true });
      onHairTaskChanged(id);
    },
  });
}

export function useSetHairTaskActive() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      setHairTaskActive(getDb(), id, active);
      return id;
    },
    onSuccess: (id) => {
      invalidate(client);
      onHairTaskChanged(id);
    },
  });
}

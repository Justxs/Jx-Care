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
import type { PhotoAngle, ProgressArea } from '@/db/enums';
import { qk } from '@/db/queryKeys';
import { weekStart as weekOf } from '@/lib/appDay';
import { syncEntity } from '@/notifications';
import { appStore } from '@/state/app';

import { progressFiles } from './files';
import {
  deletePhoto,
  deleteWeek,
  getWeekEntry,
  lastPhoto,
  listTimeline,
  photoForDay,
  saveCheckInWithFiles,
  skipWeek,
  thisWeekStatus,
  weekContext,
} from './repo';
import type { SaveCheckInInput } from './types';

const useToday = () => useSelector(appStore, (s) => s.activeDay);

const keys = {
  week: (area: ProgressArea, weekStart: string) =>
    [...qk.progress.all, 'week', area, weekStart] as const,
  last: (area: ProgressArea, angle: PhotoAngle, before: string) =>
    [...qk.progress.all, 'last', area, angle, before] as const,
  context: (area: ProgressArea, weekStart: string, today: string) =>
    [...qk.progress.all, 'context', area, weekStart, today] as const,
  status: (area: ProgressArea, today: string) =>
    [...qk.progress.all, 'status', area, today] as const,
  day: (day: string) => [...qk.progress.all, 'day', day] as const,
};

/** Progress photos (C3): one tile per week, newest first. */
export function useTimeline(area: ProgressArea) {
  const today = useToday();
  const thisWeek = weekOf(today);
  return useQuery({
    queryKey: [...qk.progress.list(area), thisWeek],
    queryFn: () => listTimeline(getDb(), area, thisWeek),
    placeholderData: keepPreviousData,
  });
}

/** Week detail (C6) and review of a retake (C5). */
export function useWeekEntry(area: ProgressArea, weekStart: string) {
  return useQuery({
    queryKey: keys.week(area, weekStart),
    queryFn: () => getWeekEntry(getDb(), area, weekStart),
  });
}

/** The camera's guide (C4): the latest photo of this angle from an earlier week. */
export function useLastPhoto(area: ProgressArea, angle: PhotoAngle) {
  const before = weekOf(useToday());
  return useQuery({
    queryKey: keys.last(area, angle, before),
    queryFn: () => lastPhoto(getDb(), area, angle, before),
  });
}

/** C6 "What changed this week". */
export function useWeekContext(area: ProgressArea, weekStart: string) {
  const today = useToday();
  return useQuery({
    queryKey: keys.context(area, weekStart, today),
    queryFn: () => weekContext(getDb(), area, weekStart, today),
  });
}

/** This week's photo status for `today`; shared by the hook and Today's prefetch. */
export const thisWeekStatusQuery = (area: ProgressArea, today: string) =>
  queryOptions({
    queryKey: keys.status(area, today),
    queryFn: () => thisWeekStatus(getDb(), area, today),
  });

/** Today's check-in photo row and the reminder: taken, skipped or due. */
export function useThisWeekStatus(area: ProgressArea) {
  return useQuery(thisWeekStatusQuery(area, useToday()));
}

/** Weekly photos taken on a day, for day detail (C2). */
export function usePhotosForDay(day: string) {
  return useQuery({ queryKey: keys.day(day), queryFn: () => photoForDay(getDb(), day) });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * After a week is taken, skipped or deleted: refreshes the progress screens, Today's check-in
 * photo row (qk.today.day(day)) and day detail (qk.calendar.day(day)), and reschedules the weekly
 * photo reminder, so a week that is done gets no reminder (task 036).
 */
function onChanged(client: QueryClient): void {
  client.invalidateQueries({ queryKey: qk.progress.all });
  client.invalidateQueries({ queryKey: qk.today.all });
  client.invalidateQueries({ queryKey: [...qk.calendar.all, 'day'] });
  syncEntity('weekly_photo', null).catch(() => {
    // No notification layer yet (tests) or no permission: the next sync catches up.
  });
}

export function useSaveCheckIn() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveCheckInInput) => saveCheckInWithFiles(getDb(), input, progressFiles),
    onSuccess: () => onChanged(client),
  });
}

/** "Skip this week" for the week that holds today. */
export function useSkipWeek() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (area: ProgressArea) =>
      skipWeek(getDb(), area, weekOf(appStore.state.activeDay)),
    onSuccess: () => onChanged(client),
  });
}

export function useDeletePhoto() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (photoId: number) => deletePhoto(getDb(), photoId, progressFiles),
    onSuccess: () => onChanged(client),
  });
}

export function useDeleteWeek() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: number) => deleteWeek(getDb(), entryId, progressFiles),
    onSuccess: () => onChanged(client),
  });
}

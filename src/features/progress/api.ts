import {
  keepPreviousData,
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

/**
 * The weekly photo reminder (task 036) reschedules here whenever a week is taken, skipped or
 * deleted. Does nothing yet.
 */
export function onWeeklyPhotoChanged(_area: ProgressArea): void {}

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
  bytes: [...qk.progress.all, 'bytes'] as const,
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

/** Today's check-in photo row and the reminder: taken, skipped or due. */
export function useThisWeekStatus(area: ProgressArea) {
  const today = useToday();
  return useQuery({
    queryKey: keys.status(area, today),
    queryFn: () => thisWeekStatus(getDb(), area, today),
  });
}

/** Weekly photos taken on a day, for day detail (C2). */
export function usePhotosForDay(day: string) {
  return useQuery({ queryKey: keys.day(day), queryFn: () => photoForDay(getDb(), day) });
}

/** Space the photos take, for Backup and restore (S8). */
export function usePhotoStorageBytes() {
  return useQuery({ queryKey: keys.bytes, queryFn: () => progressFiles.totalPhotoBytes() });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

function invalidate(client: QueryClient): void {
  client.invalidateQueries({ queryKey: qk.progress.all });
  // Today's check-in photo row (qk.today(day)) and day detail (qk.calendar.day(day)).
  client.invalidateQueries({ queryKey: ['today'] });
  client.invalidateQueries({ queryKey: [...qk.calendar.all, 'day'] });
}

export function useSaveCheckIn() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveCheckInInput) => saveCheckInWithFiles(getDb(), input, progressFiles),
    onSuccess: (_result, input) => {
      invalidate(client);
      onWeeklyPhotoChanged(input.area);
    },
  });
}

/** "Skip this week"; the week defaults to the one that holds today. */
export function useSkipWeek() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ area, weekStart }: { area: ProgressArea; weekStart?: string }) =>
      skipWeek(getDb(), area, weekStart ?? weekOf(appStore.state.activeDay)),
    onSuccess: (_id, { area }) => {
      invalidate(client);
      onWeeklyPhotoChanged(area);
    },
  });
}

export function useDeletePhoto() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ photoId }: { photoId: number; area: ProgressArea }) =>
      deletePhoto(getDb(), photoId, progressFiles),
    onSuccess: (_result, { area }) => {
      invalidate(client);
      onWeeklyPhotoChanged(area);
    },
  });
}

export function useDeleteWeek() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ entryId }: { entryId: number; area: ProgressArea }) =>
      deleteWeek(getDb(), entryId, progressFiles),
    onSuccess: (_result, { area }) => {
      invalidate(client);
      onWeeklyPhotoChanged(area);
    },
  });
}

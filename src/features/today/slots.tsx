import { useQuery } from '@tanstack/react-query';
import { useSelector } from '@tanstack/react-store';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import { SkinCheckIn } from '@/features/condition/components/SkinCheckIn';
import { ConflictTagButton } from '@/features/conflicts/components/ConflictSheets';
import { useDayRoutineConflicts } from '@/features/conflicts/hooks';
import { useHairDueToday, useHairStreakChip } from '@/features/hair/api';
import { HairDueRows } from '@/features/hair/components/HairDueRows';
import { useThisWeekStatus } from '@/features/progress/api';
import { WeeklyPhotoRow } from '@/features/progress/components/WeeklyPhotoRow';
import { useSettings } from '@/features/settings/api';
import { useToBuyCount } from '@/features/shopping/api';
import type { Streak } from '@/lib/streak';
import { isPhotoRowDay } from '@/lib/weeklyPhoto';
import { appStore } from '@/state/app';

import { setupQuery } from './api';

/**
 * Places in Today that later tasks fill in. Each returns "nothing" for now, so its section or
 * row stays hidden. When a slot gets data, add its query to `prefetchToday` too, so Today still
 * paints complete on the first frame.
 */

/**
 * Hair streak chip (task 033): washes only, once a wash task exists. Like the skin chip it waits
 * for the first routine (spec T1: no streak chips until a routine exists).
 */
export function useHairStreakSlot(): Streak | null {
  const day = useSelector(appStore, (s) => s.activeDay);
  const hasRoutine = !!useQuery(setupQuery(day)).data?.routine;
  const streak = useHairStreakChip().data;
  return hasRoutine && streak ? streak : null;
}

/** Conflict tag on a routine card (task 030) for today's steps. Opens the conflict sheet. */
export function useCardConflictSlot(routineId: number): ReactNode {
  const day = useSelector(appStore, (s) => s.activeDay);
  const targets = useDayRoutineConflicts(routineId, day);
  if (targets.length === 0) return null;
  return <ConflictTagButton targets={targets} routineId={routineId} />;
}

/** Hair due rows (task 033): the section is hidden while this is null. */
export function useHairDueSlot(): ReactNode {
  const rows = useHairDueToday().data;
  if (!rows || rows.length === 0) return null;
  return <HairDueRows rows={rows} onOpen={(id) => router.push(`/hair/done/${id}`)} />;
}

/** "Shopping list · 3 to buy" count at the foot of Expiring soon (task 034); null hides the row. */
export function useShoppingToBuySlot(): number | null {
  const count = useToBuyCount().data ?? 0;
  return count > 0 ? count : null;
}

/**
 * Check-in weekly photo row (task 036): while Weekly photo is on, from the chosen weekday to the
 * end of the week, until this week's skin photo is taken or skipped.
 */
export function useWeeklyPhotoSlot(): ReactNode {
  const day = useSelector(appStore, (s) => s.activeDay);
  const settings = useSettings().data;
  const status = useThisWeekStatus('skin').data;
  if (!settings?.weeklyPhotoOn || !isPhotoRowDay(day, settings.weeklyPhotoWeekday)) return null;
  return status === 'due' ? <WeeklyPhotoRow /> : null;
}

/** Check-in "How's your skin today?" chips and "Hair and note" (task 038). */
export function useSkinCheckInSlot(): ReactNode {
  return <SkinCheckIn />;
}

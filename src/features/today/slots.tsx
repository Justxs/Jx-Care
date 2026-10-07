import type { ReactNode } from 'react';

import { useToBuyCount } from '@/features/shopping/api';
import type { Streak } from '@/lib/streak';

/**
 * Places in Today that later tasks fill in. Each returns "nothing" for now, so its section or
 * row stays hidden. When a slot gets data, add its query to `prefetchToday` too, so Today still
 * paints complete on the first frame.
 */

/** Hair streak chip (task 033). */
export function useHairStreakSlot(): Streak | null {
  return null;
}

/** Conflict tag on a routine card (task 030). Opens the conflict sheet when tapped. */
export function useCardConflictSlot(_routineId: number): ReactNode {
  return null;
}

/** Hair due rows (task 033): the section is hidden while this is null. */
export function useHairDueSlot(): ReactNode {
  return null;
}

/** "Shopping list · 3 to buy" count at the foot of Expiring soon (task 034); null hides the row. */
export function useShoppingToBuySlot(): number | null {
  const count = useToBuyCount().data ?? 0;
  return count > 0 ? count : null;
}

/** Check-in weekly photo row (task 036): shows on the weekly photo day until the photo is taken. */
export function useWeeklyPhotoSlot(): ReactNode {
  return null;
}

/** Check-in "How's your skin today?" chips and "Hair and note" (task 038). */
export function useSkinCheckInSlot(): ReactNode {
  return null;
}

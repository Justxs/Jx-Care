import type { QueryClient } from '@tanstack/react-query';

import { conditionDayQuery } from '@/features/condition/api';
import { prefetchHair } from '@/features/hair/api';
import { thisWeekStatusQuery } from '@/features/progress/api';
import { conflictDataQuery } from '@/features/conflicts/hooks';
import { settingsQuery } from '@/features/settings/api';
import { prefetchShopping } from '@/features/shopping/api';

import { todayQueries } from './api';

/**
 * Prefetches what Today needs while the lock screen is open (task 018) and at launch, so Today
 * paints complete on its first frame (spec: paint Today complete). Uses the same query options as
 * `useToday()`, so the keys always match; a query already cached and fresh is not read again.
 * Slots filled by later tasks add their queries here.
 */
export async function prefetchToday(queryClient: QueryClient, day: string): Promise<void> {
  const settings = await queryClient.query(settingsQuery());
  const queries = todayQueries(day, settings.expiryWarnDays);
  await Promise.all([
    queryClient.query(queries.setup).catch(() => {}),
    queryClient.query(queries.routines).catch(() => {}),
    queryClient.query(queries.skinStreak).catch(() => {}),
    queryClient.query(queries.expiring).catch(() => {}),
    prefetchShopping(queryClient),
    // Check-in skin chips (task 038).
    queryClient.query(conditionDayQuery(day)).catch(() => {}),
    prefetchHair(queryClient, day),
    // The Check-in card's weekly photo row (task 036).
    queryClient.query(thisWeekStatusQuery('skin', day)).catch(() => {}),
    // Conflict tags on the routine cards (task 030).
    queryClient.query(conflictDataQuery()).catch(() => {}),
  ]);
}

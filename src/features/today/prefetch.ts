import type { QueryClient } from '@tanstack/react-query';

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
  const settings = await queryClient.fetchQuery(settingsQuery());
  const queries = todayQueries(day, settings.expiryWarnDays);
  await Promise.all([
    queryClient.prefetchQuery(queries.setup),
    queryClient.prefetchQuery(queries.routines),
    queryClient.prefetchQuery(queries.skinStreak),
    queryClient.prefetchQuery(queries.expiring),
    prefetchShopping(queryClient),
  ]);
}

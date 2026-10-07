import type { QueryClient } from '@tanstack/react-query';

/**
 * Prefetches what Today needs while the lock screen is open, so Today paints complete on its
 * first frame (spec: paint Today complete). Task 025 fills in the queries.
 */
export async function prefetchToday(queryClient: QueryClient, day: string): Promise<void> {
  void queryClient;
  void day;
}

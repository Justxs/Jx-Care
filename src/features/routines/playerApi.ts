import { useQuery } from '@tanstack/react-query';
import { useSelector } from '@tanstack/react-store';

import { getDb } from '@/db';
import { qk } from '@/db/queryKeys';
import { useSettings } from '@/features/settings/api';
import { appStore } from '@/state/app';

import { nextUp } from './playerRepo';

/** "What comes next" on the Routine done screen; refreshed with every routine change and tick. */
export function useNextUp(routineId: number) {
  const day = useSelector(appStore, (s) => s.activeDay);
  const warnDays = useSettings().data?.expiryWarnDays ?? 30;
  return useQuery({
    queryKey: [...qk.routines.all, 'nextUp', routineId, day, warnDays],
    queryFn: () => nextUp(getDb(), routineId, day, warnDays),
  });
}

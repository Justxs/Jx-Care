import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';

import { getDb } from '@/db';
import type { ConditionArea } from '@/db/enums';
import { qk } from '@/db/queryKeys';
import { gridDays, shiftMonth } from '@/features/calendar/month';

import { conditionMonth, getConditionDay, saveConditionDay, toggleState } from './repo';
import { toggleInDay, type ConditionDay, type ConditionEntry, type ConditionTag } from './tags';

/** Every condition query sits under `qk.condition.all`, which the mutations invalidate. */
export const conditionKeys = {
  day: (day: string) => qk.condition.day(day),
  month: (month: string) => [...qk.condition.all, 'month', month] as const,
};

/** A day's skin and hair logs (Today chips, T4, C2). Today's is prefetched with Today. */
export const conditionDayQuery = (day: string) =>
  queryOptions({
    queryKey: conditionKeys.day(day),
    queryFn: () => getConditionDay(getDb(), day),
  });

export function useConditionDay(day: string) {
  return useQuery(conditionDayQuery(day));
}

const conditionMonthQuery = (month: string) =>
  queryOptions({
    queryKey: conditionKeys.month(month),
    queryFn: () => conditionMonth(getDb(), gridDays(month)),
  });

/**
 * C1 Condition view: the skin states of the 42 grid days of `month` ('YYYY-MM') from one query;
 * the months either side are prefetched for the swipe.
 */
export function useConditionMonth(month: string) {
  const client = useQueryClient();
  useEffect(() => {
    for (const n of [-1, 1]) {
      client.prefetchQuery(conditionMonthQuery(shiftMonth(month, n))).catch(() => {});
    }
  }, [client, month]);
  return useQuery({ ...conditionMonthQuery(month), placeholderData: keepPreviousData });
}

/** Condition changes show in the calendar and in a progress week's summary. */
function invalidateCondition(client: QueryClient): void {
  client.invalidateQueries({ queryKey: qk.condition.all });
  client.invalidateQueries({ queryKey: qk.progress.all });
}

export type ToggleConditionVars = { day: string; area: ConditionArea; state: ConditionTag };

/**
 * One tap on a tag chip (Today): the chip changes at once (optimistic) and rolls back if the
 * write fails. Taps run one after another, so quick taps never overtake each other.
 */
export function useToggleConditionState() {
  const client = useQueryClient();
  return useMutation({
    scope: { id: 'condition-toggle' },
    mutationFn: async (v: ToggleConditionVars) => toggleState(getDb(), v.day, v.area, v.state),
    onMutate: async (v) => {
      const key = conditionKeys.day(v.day);
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<ConditionDay>(key);
      client.setQueryData<ConditionDay>(key, toggleInDay(previous ?? {}, v.area, v.state));
      return { previous };
    },
    onError: (_error, v, context) => {
      client.setQueryData(conditionKeys.day(v.day), context?.previous);
    },
    onSuccess: (day, v) => {
      client.setQueryData(conditionKeys.day(v.day), day);
    },
    onSettled: () => invalidateCondition(client),
  });
}

export type SaveConditionVars = {
  day: string;
  skin?: ConditionEntry | null;
  hair?: ConditionEntry | null;
};

/** T4 Save: replaces the day's skin and hair logs. */
export function useSaveConditionDay() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ day, ...input }: SaveConditionVars) =>
      saveConditionDay(getDb(), day, input),
    onSuccess: (saved, v) => {
      client.setQueryData(conditionKeys.day(v.day), saved);
      invalidateCondition(client);
    },
  });
}

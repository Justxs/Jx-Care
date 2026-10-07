import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getDb } from '@/db';
import { qk } from '@/db/queryKeys';
import { phoneLanguage } from '@/i18n';

import { getSettings, saveSettings, type AppSettings, type SettingsPatch } from './repo';

/** The settings row (or defaults before onboarding); shared by `useSettings` and prefetches. */
export const settingsQuery = () =>
  queryOptions({
    queryKey: qk.settings,
    queryFn: (): AppSettings => getSettings(getDb(), phoneLanguage()),
  });

export function useSettings() {
  return useQuery(settingsQuery());
}

export function useUpdateSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (patch: SettingsPatch) => saveSettings(getDb(), patch),
    onSuccess: (next) => {
      client.setQueryData(qk.settings, next);
      // Settings change Today (warning window, setup card) and every expiry badge.
      client.invalidateQueries({ queryKey: qk.today.all });
      client.invalidateQueries({ queryKey: qk.products.all });
    },
  });
}

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useSelector } from '@tanstack/react-store';
import { useTranslation } from 'react-i18next';

import { getDb } from '@/db';
import { qk } from '@/db/queryKeys';
import type { AvoidItem } from '@/db/schema';
import { useSettings } from '@/features/settings/api';
import { appStore } from '@/state/app';

import {
  addAvoidIngredientByName,
  addAvoidItem,
  listAvoidItems,
  productsWithAvoided,
  removeAvoidItem,
  restoreAvoidItem,
  type AvoidInput,
} from './avoidRepo';

/**
 * S4 reads. Both depend on products (counts, badges) as much as on the list, so they sit under
 * `qk.products.all`: every product change refreshes them, and avoid changes invalidate it too.
 */
const avoidListKey = [...qk.products.all, 'avoidList'] as const;

export function useAvoidItems() {
  return useQuery({
    queryKey: [...avoidListKey, 'items'],
    queryFn: () => listAvoidItems(getDb()),
    placeholderData: keepPreviousData,
  });
}

/** "Products that contain these": products in use with the red Avoid badge, by name. */
export function useAvoidedProducts() {
  const { i18n } = useTranslation();
  const today = useSelector(appStore, (s) => s.activeDay);
  const warnDays = useSettings().data?.expiryWarnDays ?? 30;
  return useQuery({
    queryKey: [...avoidListKey, 'products', today, warnDays, i18n.language],
    queryFn: () => productsWithAvoided(getDb(), today, warnDays, i18n.language),
    placeholderData: keepPreviousData,
  });
}

/** Avoid changes reach the badges and filter (P1, P2), the form's warning (P3) and S2's counts. */
function invalidateAvoid(client: QueryClient): void {
  for (const queryKey of [qk.avoid.all, qk.products.all, qk.ingredients.all]) {
    client.invalidateQueries({ queryKey });
  }
}

export type AddAvoidVars = AvoidInput | { name: string; note?: string | null };

/** Adds a picked ingredient or group, or a typed name (a new name joins the ingredient list). */
export function useAddAvoidItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (vars: AddAvoidVars) =>
      'name' in vars
        ? addAvoidIngredientByName(getDb(), vars.name, vars.note)
        : addAvoidItem(getDb(), vars),
    onSuccess: () => invalidateAvoid(client),
  });
}

/** Removes an entry; resolves to the removed row, which Undo hands to `useRestoreAvoidItem`. */
export function useRemoveAvoidItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => removeAvoidItem(getDb(), id),
    onSuccess: () => invalidateAvoid(client),
  });
}

export function useRestoreAvoidItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (row: AvoidItem) => restoreAvoidItem(getDb(), row),
    onSuccess: () => invalidateAvoid(client),
  });
}

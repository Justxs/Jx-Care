import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useSelector } from '@tanstack/react-store';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { getDb } from '@/db';
import type { ShoppingList } from '@/db/enums';
import { qk } from '@/db/queryKeys';
import type { ShoppingItem } from '@/db/schema';
import { useSettings } from '@/features/settings/api';
import { appStore } from '@/state/app';
import { showToast } from '@/state/ui';

import {
  addBuyAgain,
  addItem,
  clearBought,
  deleteItem,
  deleteItems,
  dismissSuggestion,
  linkItemToProduct,
  listShopping,
  moveToList,
  pickerProducts,
  restoreItems,
  setBought,
  suggestions,
  toBuyCount,
  updateItem,
} from './repo';
import type { NewShoppingItemInput, ShoppingAreaFilter } from './types';

const countKey = [...qk.shopping.all, 'count'] as const;

export function useShoppingList(area: ShoppingAreaFilter) {
  return useQuery({
    queryKey: [...qk.shopping.list, area],
    queryFn: () => listShopping(getDb(), area),
    placeholderData: keepPreviousData,
  });
}

export function useSuggestions() {
  const today = useSelector(appStore, (s) => s.activeDay);
  const warnDays = useSettings().data?.expiryWarnDays ?? 30;
  return useQuery({
    queryKey: [...qk.shopping.suggestions, today, warnDays],
    queryFn: () => suggestions(getDb(), today, warnDays),
  });
}

/** Open To buy items, for the Shopping segment badge and Today's Shopping list row. */
export function useToBuyCount() {
  return useQuery({ queryKey: countKey, queryFn: () => toBuyCount(getDb()) });
}

/** For `prefetchToday`, so Today's Shopping list row is known on its first frame. */
export function prefetchShopping(client: QueryClient): Promise<void> {
  return client.prefetchQuery({ queryKey: countKey, queryFn: () => toBuyCount(getDb()) });
}

export function usePickerProducts(search: string) {
  const { i18n } = useTranslation();
  return useQuery({
    queryKey: [...qk.shopping.all, 'picker', search, i18n.language],
    queryFn: () => pickerProducts(getDb(), search, i18n.language),
    placeholderData: keepPreviousData,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/** Every shopping query, Today's To buy count included, sits under `qk.shopping.all`. */
function invalidate(client: QueryClient): void {
  client.invalidateQueries({ queryKey: qk.shopping.all });
}

function useShoppingMutation<TArg, TResult>(fn: (arg: TArg) => TResult) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (arg: TArg) => fn(arg),
    onSuccess: () => invalidate(client),
  });
}

export const useAddItem = () =>
  useShoppingMutation((input: NewShoppingItemInput) => addItem(getDb(), input));

export const useUpdateItem = () =>
  useShoppingMutation(({ id, patch }: { id: number; patch: Partial<NewShoppingItemInput> }) =>
    updateItem(getDb(), id, patch),
  );

export const useDeleteItem = () => useShoppingMutation((id: number) => deleteItem(getDb(), id));

export const useDeleteItems = () =>
  useShoppingMutation((ids: readonly number[]) => deleteItems(getDb(), ids));

export const useMoveToList = () =>
  useShoppingMutation(({ id, list }: { id: number; list: ShoppingList }) =>
    moveToList(getDb(), id, list),
  );

/** Ticks (`bought` true, now) or unticks an item. */
export const useSetBought = () =>
  useShoppingMutation(({ id, bought }: { id: number; bought: boolean }) =>
    setBought(getDb(), id, bought ? Date.now() : null),
  );

export const useClearBought = () => useShoppingMutation((_: void) => clearBought(getDb()));

export const useRestoreItems = () =>
  useShoppingMutation((rows: readonly ShoppingItem[]) => restoreItems(getDb(), rows));

export const useDismissSuggestion = () =>
  useShoppingMutation((productId: number) => dismissSuggestion(getDb(), productId));

/** Buy again for each product; returns the ids of the items it created (already listed: none). */
function addBuyAgainItems(productIds: readonly number[]): number[] {
  return productIds.flatMap((id) => {
    const added = addBuyAgain(getDb(), id);
    return added?.created ? [added.id] : [];
  });
}

/** After Add product saves the bottle made from a bought item (product form `fromShoppingItem`). */
export const useLinkBoughtItem = () =>
  useShoppingMutation(({ itemId, productId }: { itemId: number; productId: number }) =>
    linkItemToProduct(getDb(), itemId, productId),
  );

// ─── Buy again ──────────────────────────────────────────────────────────────

/**
 * Buy again outside React (the expiry-warning notification action, task 021): adds the items
 * and refreshes the list.
 */
export function addToShoppingList(client: QueryClient, productIds: readonly number[]): void {
  addBuyAgainItems(productIds);
  invalidate(client);
}

export type BuyAgain = (products: { id: number; name: string }[]) => void;

/**
 * The one Buy again action (P1 rows and select bar, P2, P5, T2, Today, Mark finished toast):
 * adds linked To buy items and shows "Vitamin C serum added to your shopping list" with Undo.
 */
export function useBuyAgain(): BuyAgain {
  const { t } = useTranslation();
  const { mutateAsync } = useShoppingMutation(addBuyAgainItems);
  const { mutate: undoMutate } = useDeleteItems();
  return useCallback(
    (products) => {
      if (products.length === 0) return;
      void mutateAsync(products.map((p) => p.id)).then((created) => {
        if (created.length === 0) {
          showToast({
            message:
              products.length === 1
                ? t('shopping.alreadyListedToast', { name: products[0]!.name })
                : t('shopping.allListedToast'),
          });
          return;
        }
        showToast({
          message:
            products.length === 1
              ? t('shopping.addedToast', { name: products[0]!.name })
              : t('shopping.addedManyToast', { count: created.length }),
          actionLabel: t('common.undo'),
          onAction: () => undoMutate(created),
        });
      });
    },
    [mutateAsync, undoMutate, t],
  );
}

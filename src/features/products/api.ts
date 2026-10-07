import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useSelector } from '@tanstack/react-store';

import { eq } from 'drizzle-orm';

import { getDb } from '@/db';
import { qk } from '@/db/queryKeys';
import { product } from '@/db/schema';
import { useSettings } from '@/features/settings/api';
import { effectiveExpiry } from '@/lib/expiry';
import { appStore } from '@/state/app';

import { deletePhotoFile } from './photoFiles';
import {
  avoidContext,
  brandSuggestions,
  countArchived,
  createProduct,
  deletePhotoIfUnused,
  deleteProduct,
  duplicateProduct,
  expiringSoon,
  getProduct,
  hasAnyProduct,
  hasProductWithExpiry,
  listArchived,
  listKnownIngredients,
  listProducts,
  markFinished,
  markFinishedMany,
  markOpened,
  productsForPicker,
  restoreProduct,
  undoFinished,
  updateProduct,
  type PreviousArchive,
} from './repo';
import type { ProductInput } from './schema';
import type { ArchiveSort, ProductFilters } from './types';

/**
 * Expiry notifications (task 021) reschedule here whenever a product is created, changed,
 * finished, restored or deleted. Does nothing yet.
 */
export function onProductChanged(_id: number): void {}

/** The app day and warning window every expiry status depends on; part of each query key. */
function useExpiryContext() {
  const today = useSelector(appStore, (s) => s.activeDay);
  const warnDays = useSettings().data?.expiryWarnDays ?? 30;
  return { today, warnDays };
}

export function useProducts(filters: ProductFilters, locale?: string) {
  const { today, warnDays } = useExpiryContext();
  return useQuery({
    queryKey: [...qk.products.list({ ...filters, locale }), today, warnDays],
    queryFn: () => listProducts(getDb(), filters, today, warnDays, locale),
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: number) {
  const { today, warnDays } = useExpiryContext();
  return useQuery({
    queryKey: [...qk.products.detail(id), today, warnDays],
    queryFn: () => getProduct(getDb(), id, today, warnDays),
  });
}

export function useArchivedProducts(sort: ArchiveSort) {
  return useQuery({
    queryKey: qk.products.archive(sort),
    queryFn: () => listArchived(getDb(), sort),
    placeholderData: keepPreviousData,
  });
}

export function useArchiveCount() {
  return useQuery({ queryKey: qk.products.counts, queryFn: () => countArchived(getDb()) });
}

export function useHasAnyProduct() {
  return useQuery({
    queryKey: [...qk.products.all, 'any'],
    queryFn: () => hasAnyProduct(getDb()),
  });
}

/** Today's Expiring soon card; shared by `useExpiringSoon` and Today's prefetch. */
export const expiringSoonQuery = (today: string, warnDays: number, limit = 3) =>
  queryOptions({
    queryKey: [...qk.products.all, 'expiring', limit, today, warnDays],
    queryFn: () => expiringSoon(getDb(), today, warnDays, limit),
  });

export function useExpiringSoon(limit = 3) {
  const { today, warnDays } = useExpiryContext();
  return useQuery(expiringSoonQuery(today, warnDays, limit));
}

export function useProductsForPicker(
  opts: { area: 'all' | 'skin' | 'hair'; search?: string },
  locale?: string,
) {
  const { today, warnDays } = useExpiryContext();
  return useQuery({
    queryKey: [...qk.products.all, 'picker', opts, locale, today, warnDays],
    queryFn: () => productsForPicker(getDb(), opts, today, warnDays, locale),
    placeholderData: keepPreviousData,
  });
}

export function useBrandSuggestions(prefix: string) {
  return useQuery({
    queryKey: [...qk.products.brands, prefix],
    queryFn: () => brandSuggestions(getDb(), prefix),
    placeholderData: keepPreviousData,
  });
}

export function useKnownIngredients() {
  return useQuery({ queryKey: qk.ingredients.list, queryFn: () => listKnownIngredients(getDb()) });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

function invalidate(client: QueryClient, opts: { ingredients?: boolean } = {}): void {
  client.invalidateQueries({ queryKey: qk.products.all });
  // Today shows expiring products and routine steps by product.
  client.invalidateQueries({ queryKey: ['today'] });
  if (opts.ingredients) {
    client.invalidateQueries({ queryKey: qk.ingredients.all });
    client.invalidateQueries({ queryKey: qk.conflicts.all });
  }
}

export function useAvoidContext() {
  return useQuery({
    queryKey: [...qk.avoid.all, 'context'],
    queryFn: () => avoidContext(getDb()),
  });
}

/**
 * Creates a product. `isFirstWithExpiry` is true when no product had an expiry date before
 * this one, so the form can show the reminder ask (task 021).
 */
export function useCreateProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProductInput) => {
      const db = getDb();
      const isFirstWithExpiry = !hasProductWithExpiry(db) && effectiveExpiry(input) !== null;
      return { id: createProduct(db, input), isFirstWithExpiry };
    },
    onSuccess: ({ id }) => {
      invalidate(client, { ingredients: true });
      onProductChanged(id);
    },
  });
}

/** Saves an edit; a replaced or removed photo file is deleted once nothing uses it. */
export function useUpdateProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: ProductInput }) => {
      const db = getDb();
      const before = db
        .select({ photoUri: product.photoUri })
        .from(product)
        .where(eq(product.id, id))
        .get();
      updateProduct(db, id, input);
      if (before?.photoUri && before.photoUri !== input.photoUri) {
        deletePhotoIfUnused(db, before.photoUri, deletePhotoFile);
      }
      return id;
    },
    onSuccess: (id) => {
      invalidate(client, { ingredients: true });
      onProductChanged(id);
    },
  });
}

export function useMarkOpened() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      markOpened(getDb(), id, appStore.state.activeDay);
      return id;
    },
    onSuccess: (id) => {
      invalidate(client);
      onProductChanged(id);
    },
  });
}

export function useMarkFinished() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => ({
      id,
      previous: markFinished(getDb(), id, appStore.state.activeDay),
    }),
    onSuccess: ({ id }) => {
      invalidate(client);
      onProductChanged(id);
    },
  });
}

export function useMarkFinishedMany() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => markFinishedMany(getDb(), ids, appStore.state.activeDay),
    onSuccess: (previous) => {
      invalidate(client);
      for (const p of previous) onProductChanged(p.id);
    },
  });
}

/** Undo for the Mark finished toasts. */
export function useUndoFinished() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (previous: PreviousArchive[]) => {
      undoFinished(getDb(), previous);
      return previous;
    },
    onSuccess: (previous) => {
      invalidate(client);
      for (const p of previous) onProductChanged(p.id);
    },
  });
}

export function useRestoreProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      restoreProduct(getDb(), id);
      return id;
    },
    onSuccess: (id) => {
      invalidate(client);
      onProductChanged(id);
    },
  });
}

export function useDeleteProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      deleteProduct(getDb(), id, deletePhotoFile);
      return id;
    },
    onSuccess: (id) => {
      client.removeQueries({ queryKey: qk.products.detail(id) });
      invalidate(client, { ingredients: true });
      onProductChanged(id);
    },
  });
}

export function useDuplicateProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => duplicateProduct(getDb(), id, appStore.state.activeDay),
    onSuccess: (id) => {
      invalidate(client);
      onProductChanged(id);
    },
  });
}

/** Deletes a photo picked in the form but never saved (Discard, or replaced before saving). */
export function discardPickedPhoto(uri: string): void {
  deletePhotoIfUnused(getDb(), uri, deletePhotoFile);
}

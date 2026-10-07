import { createStore } from '@tanstack/react-store';
import { router } from 'expo-router';
import { useEffect, useEffectEvent } from 'react';

import type { Area } from '@/db/enums';

/**
 * "Add new product" from a product picker (R4): the picker opens Add product and, once the new
 * product is saved, gets it back selected. Only the picker that asked receives it.
 */
type PickReturnState = {
  /** The picker waiting for a new product, or null. */
  waiting: number | null;
  /** The product saved for that picker, not yet taken. */
  result: { token: number; id: number; area: Area } | null;
};

export const pickReturnStore = createStore<PickReturnState>({ waiting: null, result: null });

let nextToken = 1;

/** Opens Add product (the short form) for a picker; returns the token its result comes back on. */
export function addProductForPick(prefillArea: Area | null): number {
  const token = nextToken++;
  pickReturnStore.setState(() => ({ waiting: token, result: null }));
  router.push(
    prefillArea
      ? { pathname: '/product-form', params: { prefill: JSON.stringify({ area: prefillArea }) } }
      : '/product-form',
  );
  return token;
}

/**
 * Called by the product form after it adds a product. Hands the first one to the waiting picker;
 * "Save and add another" adds more, but only the first is picked.
 */
export function productAddedForPick(product: { id: number; area: Area }): void {
  const { waiting } = pickReturnStore.state;
  if (waiting === null) return;
  pickReturnStore.setState(() => ({ waiting: null, result: { token: waiting, ...product } }));
}

/**
 * Stops waiting once the screen with the picker is back on top: the product (if one was added)
 * has been handed over by then, and a product added later elsewhere must not land in the picker.
 */
export function endAddProductForPick(): void {
  if (pickReturnStore.state.waiting === null) return;
  pickReturnStore.setState((s) => ({ ...s, waiting: null }));
}

/** Runs `onAdded` once when the product added for `token` arrives. */
export function useProductAddedForPick(
  token: number | null,
  onAdded: (product: { id: number; area: Area }) => void,
): void {
  const handle = useEffectEvent(onAdded);
  useEffect(() => {
    if (token === null) return undefined;
    const take = () => {
      const { result } = pickReturnStore.state;
      if (!result || result.token !== token) return;
      pickReturnStore.setState((s) => ({ ...s, result: null }));
      handle({ id: result.id, area: result.area });
    };
    take();
    const sub = pickReturnStore.subscribe(take);
    return () => sub.unsubscribe();
  }, [token]);
}

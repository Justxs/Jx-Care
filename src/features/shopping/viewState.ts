import { createStore } from '@tanstack/react-store';
import { router } from 'expo-router';

import { setProductsSegment } from '@/features/products/listState';

import type { ShoppingAreaFilter } from './types';

/** Shopping list view choices, kept for the session: the To buy chip and whether Suggested is open. */
export const shoppingViewStore = createStore<{
  area: ShoppingAreaFilter;
  suggestionsOpen: boolean;
}>({ area: 'all', suggestionsOpen: true });

export function setShoppingArea(area: ShoppingAreaFilter): void {
  shoppingViewStore.setState((s) => ({ ...s, area }));
}

export function setSuggestionsOpen(open: boolean): void {
  shoppingViewStore.setState((s) => ({ ...s, suggestionsOpen: open }));
}

/** Opens the Products tab on its Shopping segment (Today's Shopping list row). */
export function openShoppingList(): void {
  setProductsSegment('shopping');
  router.navigate('/products');
}

import { createStore } from '@tanstack/react-store';

import { defaultProductFilters, type ProductFilters } from './types';

/** Products list filters: kept for the session (switching tabs), not across restarts. */
export const productListStore = createStore<{ filters: ProductFilters }>({
  filters: defaultProductFilters,
});

export function setProductFilters(filters: ProductFilters): void {
  productListStore.setState((s) => ({ ...s, filters }));
}

export function resetProductFilters(): void {
  productListStore.setState((s) => ({
    ...s,
    filters: { ...defaultProductFilters, sort: s.filters.sort },
  }));
}

/** How many filters are on (search and sort aside), for the filter button. */
export function activeFilterCount(f: ProductFilters): number {
  return (
    (f.area === 'all' ? 0 : 1) + f.categories.length + f.statuses.length + (f.avoidOnly ? 1 : 0)
  );
}

export type ProductsSegment = 'mine' | 'shopping';

/** The Products tab's My products / Shopping switch, so Today can open the shopping list. */
export const productsSegmentStore = createStore<{ segment: ProductsSegment }>({ segment: 'mine' });

export function setProductsSegment(segment: ProductsSegment): void {
  productsSegmentStore.setState(() => ({ segment }));
}

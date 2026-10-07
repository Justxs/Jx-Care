import type { Area, ProductCategory, ShoppingList, Unit } from '@/db/enums';

export type ShoppingAreaFilter = 'all' | 'skin' | 'hair';

/** One shopping list row. Linked items (Buy again) carry the product's last details. */
export type ShoppingRowItem = {
  id: number;
  productId: number | null;
  name: string;
  brand: string | null;
  area: Area | null;
  note: string | null;
  list: ShoppingList;
  /** Epoch ms when ticked; null while still to buy. */
  boughtAt: number | null;
  createdAt: number;
  category: ProductCategory | null;
  priceCents: number | null;
  size: number | null;
  unit: Unit | null;
  rating: number | null;
  wouldRebuy: boolean | null;
  /** Bought, but not yet added back to Products: the row offers "Add it to your products". */
  needsProduct: boolean;
};

export type ShoppingSections = {
  toBuy: ShoppingRowItem[];
  wantToTry: ShoppingRowItem[];
  bought: ShoppingRowItem[];
};

/** Why a product is suggested: finished on a day, expired on a day, or expiring in n days. */
export type SuggestionReason =
  | { kind: 'finished'; day: string }
  | { kind: 'expired'; day: string }
  | { kind: 'expiring'; day: string; daysLeft: number };

export type Suggestion = {
  productId: number;
  name: string;
  brand: string | null;
  area: Area;
  reason: SuggestionReason;
};

/** A product in the P7 Buy again picker: active and finished products alike. */
export type ShoppingPickerProduct = {
  id: number;
  name: string;
  brand: string | null;
  area: Area;
  finished: boolean;
};

export type NewShoppingItemInput = {
  name: string;
  brand: string | null;
  area: Area | null;
  list: ShoppingList;
  note: string | null;
};

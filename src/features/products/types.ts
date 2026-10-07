import type { ProductCategory } from '@/db/enums';
import type { Product } from '@/db/schema';
import type { CostPerDay } from '@/lib/cost';
import type { ExpiryStatus } from '@/lib/expiry';

export type ProductSort = 'expiry' | 'name' | 'recent';
export type ArchiveSort = 'date' | 'cost';

export type ProductFilters = {
  area: 'all' | 'skin' | 'hair';
  categories: ProductCategory[];
  statuses: ExpiryStatus[];
  avoidOnly: boolean;
  search: string;
  sort: ProductSort;
};

export const defaultProductFilters: ProductFilters = {
  area: 'all',
  categories: [],
  statuses: [],
  avoidOnly: false,
  search: '',
  sort: 'expiry',
};

/** Fields computed from the dates; never stored. */
export type ExpiryFields = {
  status: ExpiryStatus;
  /** 0 = today, negative when expired; null without any date. */
  daysLeft: number | null;
  effectiveExpiry: string | null;
};

export type ProductListItem = Product & ExpiryFields & { avoid: boolean };

export type ProductIngredient = { id: number; name: string; groupId: number | null };

/** Where a product is used: routine steps (task 022) and hair tasks (task 031). */
export type UsedIn = { kind: 'routine' | 'hair'; id: number; name: string };

export type ProductDetail = Product &
  ExpiryFields & {
    ingredients: ProductIngredient[];
    avoid: boolean;
    /** Only once finished (archived) and when price and opened date are known. */
    costPerDay: CostPerDay | null;
    usedIn: UsedIn[];
  };

export type ArchivedProduct = Product & { archivedAt: string; costPerDay: CostPerDay | null };

export type PickerProduct = Pick<
  Product,
  'id' | 'name' | 'brand' | 'area' | 'category' | 'photoUri'
> &
  ExpiryFields;

import { and, asc, count, desc, eq, inArray, isNotNull, isNull, or } from 'drizzle-orm';

import type { Db, DbOrTx } from '@/db';
import { avoidItem, ingredient, product, productIngredient } from '@/db/schema';
import type { Product } from '@/db/schema';
import { costPerDayCents } from '@/lib/cost';
import { avoidMatches, type AvoidItemLite } from '@/lib/avoid';
import { daysLeft, effectiveExpiry, expiryStatus, sortBySoonestExpiry } from '@/lib/expiry';
import { normalizeName, tidy } from '@/lib/text';

import type { ProductInput } from './schema';
import type {
  ArchiveSort,
  ArchivedProduct,
  ExpiryFields,
  PickerProduct,
  ProductDetail,
  ProductFilters,
  ProductIngredient,
  ProductListItem,
  UsedIn,
} from './types';

// ─── Computed fields ────────────────────────────────────────────────────────

function expiryFields(p: Product, today: string, warnDays: number): ExpiryFields {
  return {
    status: expiryStatus(p, today, warnDays),
    daysLeft: daysLeft(p, today),
    effectiveExpiry: effectiveExpiry(p),
  };
}

/** Product id → avoid list hit, for every product that has ingredients. */
function avoidedProductIds(db: DbOrTx, productIds?: readonly number[]): Set<number> {
  const items: AvoidItemLite[] = db
    .select({ id: avoidItem.id, kind: avoidItem.kind, refId: avoidItem.refId })
    .from(avoidItem)
    .all();
  if (items.length === 0) return new Set();
  const links = db
    .select({
      productId: productIngredient.productId,
      ingredientId: productIngredient.ingredientId,
      groupId: ingredient.groupId,
    })
    .from(productIngredient)
    .innerJoin(ingredient, eq(ingredient.id, productIngredient.ingredientId))
    .where(productIds ? inArray(productIngredient.productId, [...productIds]) : undefined)
    .all();
  const groupOf = new Map<number, number | null>();
  const byProduct = new Map<number, number[]>();
  for (const l of links) {
    groupOf.set(l.ingredientId, l.groupId);
    const list = byProduct.get(l.productId) ?? [];
    list.push(l.ingredientId);
    byProduct.set(l.productId, list);
  }
  const out = new Set<number>();
  for (const [productId, ids] of byProduct) {
    if (avoidMatches(ids, groupOf, items).length > 0) out.add(productId);
  }
  return out;
}

function matchesSearch(p: Pick<Product, 'name' | 'brand'>, search: string): boolean {
  const q = normalizeName(search);
  if (!q) return true;
  return normalizeName(p.name).includes(q) || normalizeName(p.brand ?? '').includes(q);
}

function matchesArea(area: Product['area'], filter: 'all' | 'skin' | 'hair'): boolean {
  return filter === 'all' || area === filter || area === 'both';
}

function byName<T extends { name: string }>(rows: T[], locale?: string): T[] {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
  return rows.toSorted((a, b) => collator.compare(a.name, b.name));
}

// ─── Lists ──────────────────────────────────────────────────────────────────

/** Active products filtered and sorted (spec P1). `locale` orders the A–Z sort. */
export function listProducts(
  db: Db,
  filters: ProductFilters,
  today: string,
  warnDays: number,
  locale?: string,
): ProductListItem[] {
  const rows = db.select().from(product).where(isNull(product.archivedAt)).all();
  const avoided = avoidedProductIds(db);
  const items = rows
    .filter((p) => matchesArea(p.area, filters.area))
    .filter((p) => filters.categories.length === 0 || filters.categories.includes(p.category))
    .filter((p) => matchesSearch(p, filters.search))
    .map((p) => ({ ...p, ...expiryFields(p, today, warnDays), avoid: avoided.has(p.id) }))
    .filter((p) => filters.statuses.length === 0 || filters.statuses.includes(p.status))
    .filter((p) => !filters.avoidOnly || p.avoid);

  switch (filters.sort) {
    case 'name':
      return byName(items, locale);
    case 'recent':
      return items.toSorted((a, b) => b.createdAt - a.createdAt || b.id - a.id);
    default:
      return sortBySoonestExpiry(items);
  }
}

export function countArchived(db: Db): number {
  const [row] = db.select({ n: count() }).from(product).where(isNotNull(product.archivedAt)).all();
  return row?.n ?? 0;
}

export function hasAnyProduct(db: Db): boolean {
  return db.select({ id: product.id }).from(product).limit(1).all().length > 0;
}

/** Active products with status expiring or expired, soonest first (Today card). */
export function expiringSoon(
  db: Db,
  today: string,
  warnDays: number,
  limit: number,
): ProductListItem[] {
  return listProducts(
    db,
    {
      area: 'all',
      categories: [],
      statuses: ['expired', 'expiring'],
      avoidOnly: false,
      search: '',
      sort: 'expiry',
    },
    today,
    warnDays,
  ).slice(0, limit);
}

/** Active products of an area for the step and shopping pickers (R4, P7), by name. */
export function productsForPicker(
  db: Db,
  opts: { area: 'all' | 'skin' | 'hair'; search?: string },
  today: string,
  warnDays: number,
  locale?: string,
): PickerProduct[] {
  const rows = db.select().from(product).where(isNull(product.archivedAt)).all();
  const picked = rows
    .filter((p) => matchesArea(p.area, opts.area))
    .filter((p) => matchesSearch(p, opts.search ?? ''))
    .map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      area: p.area,
      category: p.category,
      photoUri: p.photoUri,
      ...expiryFields(p, today, warnDays),
    }));
  return byName(picked, locale);
}

/** Archived products (P5). Cost sort: highest cost per day first, products without a cost last. */
export function listArchived(db: Db, sort: ArchiveSort): ArchivedProduct[] {
  const rows = db
    .select()
    .from(product)
    .where(isNotNull(product.archivedAt))
    .orderBy(desc(product.archivedAt), desc(product.id))
    .all()
    .map((p) => ({
      ...p,
      archivedAt: p.archivedAt as string,
      costPerDay: costPerDayCents(p.priceCents, p.openedAt, p.archivedAt),
    }));
  if (sort === 'date') return rows;
  return rows.toSorted((a, b) => {
    if (a.costPerDay && b.costPerDay) return b.costPerDay.cents - a.costPerDay.cents;
    if (a.costPerDay) return -1;
    if (b.costPerDay) return 1;
    return 0;
  });
}

/** Distinct earlier brands starting with the prefix (accent- and case-insensitive), up to 5. */
export function brandSuggestions(db: Db, prefix: string): string[] {
  const q = normalizeName(prefix);
  const rows = db
    .select({ brand: product.brand })
    .from(product)
    .where(isNotNull(product.brand))
    .orderBy(desc(product.updatedAt))
    .all();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { brand } of rows) {
    if (!brand) continue;
    const key = normalizeName(brand);
    if (seen.has(key) || !key.startsWith(q) || key === q) continue;
    seen.add(key);
    out.push(brand);
    if (out.length === 5) break;
  }
  return out;
}

export function listKnownIngredients(db: Db) {
  return db
    .select({
      id: ingredient.id,
      name: ingredient.name,
      normalizedName: ingredient.normalizedName,
      groupId: ingredient.groupId,
    })
    .from(ingredient)
    .orderBy(asc(ingredient.normalizedName))
    .all();
}

// ─── Detail ─────────────────────────────────────────────────────────────────

type UsedInSource = (db: Db, productId: number) => UsedIn[];
const usedInSources: UsedInSource[] = [];

/** Routines (task 022) and hair tasks (task 031) register where a product is used. */
export function addUsedInSource(source: UsedInSource): void {
  if (!usedInSources.includes(source)) usedInSources.push(source);
}

export function usedIn(db: Db, productId: number): UsedIn[] {
  return usedInSources.flatMap((source) => source(db, productId));
}

export function productIngredients(db: DbOrTx, productId: number): ProductIngredient[] {
  return db
    .select({ id: ingredient.id, name: ingredient.name, groupId: ingredient.groupId })
    .from(productIngredient)
    .innerJoin(ingredient, eq(ingredient.id, productIngredient.ingredientId))
    .where(eq(productIngredient.productId, productId))
    .orderBy(asc(productIngredient.position))
    .all();
}

export function getProduct(
  db: Db,
  id: number,
  today: string,
  warnDays: number,
): ProductDetail | null {
  const p = db.select().from(product).where(eq(product.id, id)).get();
  if (!p) return null;
  return {
    ...p,
    ...expiryFields(p, today, warnDays),
    ingredients: productIngredients(db, id),
    avoid: avoidedProductIds(db, [id]).has(id),
    costPerDay: p.archivedAt ? costPerDayCents(p.priceCents, p.openedAt, p.archivedAt) : null,
    usedIn: usedIn(db, id),
  };
}

// ─── Writes ─────────────────────────────────────────────────────────────────

/**
 * Replaces a product's ingredient list. Each line finds or creates an ingredient by normalised
 * name; dropped links go, the ingredient rows stay. Returns the ingredient ids in order.
 */
export function saveIngredients(db: DbOrTx, productId: number, lines: readonly string[]): number[] {
  db.delete(productIngredient).where(eq(productIngredient.productId, productId)).run();
  const ids: number[] = [];
  for (const line of lines) {
    const name = tidy(line);
    const normalizedName = normalizeName(name);
    if (!normalizedName) continue;
    let row = db
      .select({ id: ingredient.id })
      .from(ingredient)
      .where(eq(ingredient.normalizedName, normalizedName))
      .get();
    row ??= db
      .insert(ingredient)
      .values({ name, normalizedName })
      .returning({ id: ingredient.id })
      .get();
    if (ids.includes(row.id)) continue;
    ids.push(row.id);
  }
  if (ids.length > 0) {
    db.insert(productIngredient)
      .values(ids.map((ingredientId, position) => ({ productId, ingredientId, position })))
      .run();
  }
  return ids;
}

function productValues(input: ProductInput) {
  return {
    name: input.name,
    brand: input.brand,
    area: input.area,
    category: input.category,
    photoUri: input.photoUri,
    size: input.size,
    unit: input.size == null ? null : input.unit,
    priceCents: input.price,
    purchasedAt: input.purchasedAt,
    expiresAt: input.expiresAt,
    openedAt: input.openedAt,
    paoMonths: input.paoMonths,
    notes: input.notes,
  };
}

export function createProduct(db: Db, input: ProductInput): number {
  return db.transaction((tx) => {
    const { id } = tx
      .insert(product)
      .values(productValues(input))
      .returning({ id: product.id })
      .get();
    saveIngredients(tx, id, input.ingredients);
    return id;
  });
}

export function updateProduct(db: Db, id: number, input: ProductInput): void {
  db.transaction((tx) => {
    tx.update(product).set(productValues(input)).where(eq(product.id, id)).run();
    saveIngredients(tx, id, input.ingredients);
  });
}

export function markOpened(db: Db, id: number, today: string): void {
  db.update(product).set({ openedAt: today }).where(eq(product.id, id)).run();
}

/** Archives a product; returns the previous `archivedAt` for Undo. */
export function markFinished(db: Db, id: number, today: string): string | null {
  return markFinishedMany(db, [id], today)[0]?.archivedAt ?? null;
}

export type PreviousArchive = { id: number; archivedAt: string | null };

/** Archives several products in one transaction; returns each one's previous value for Undo. */
export function markFinishedMany(db: Db, ids: readonly number[], today: string): PreviousArchive[] {
  if (ids.length === 0) return [];
  return db.transaction((tx) => {
    const previous = tx
      .select({ id: product.id, archivedAt: product.archivedAt })
      .from(product)
      .where(inArray(product.id, [...ids]))
      .all();
    tx.update(product)
      .set({ archivedAt: today })
      .where(inArray(product.id, [...ids]))
      .run();
    return ids.flatMap((id) => previous.filter((p) => p.id === id));
  });
}

/** Undo for Mark finished: puts back each product's previous `archivedAt`. */
export function undoFinished(db: Db, previous: readonly PreviousArchive[]): void {
  db.transaction((tx) => {
    for (const p of previous) {
      tx.update(product).set({ archivedAt: p.archivedAt }).where(eq(product.id, p.id)).run();
    }
  });
}

export function restoreProduct(db: Db, id: number): void {
  db.update(product).set({ archivedAt: null }).where(eq(product.id, id)).run();
}

export class ActiveProductDeleteError extends Error {
  constructor() {
    super('Only finished (archived) products can be deleted');
    this.name = 'ActiveProductDeleteError';
  }
}

export type DeleteFile = (uri: string) => void;

/**
 * Deletes an archived product for good (refinement 10) and its photo, unless another product
 * still uses the same photo file. Throws for an active product. `deleteFile` is injected so
 * tests never touch the file system (the app passes `deletePhotoFile`).
 */
export function deleteProduct(db: Db, id: number, deleteFile: DeleteFile): void {
  const p = db.select().from(product).where(eq(product.id, id)).get();
  if (!p) return;
  if (!p.archivedAt) throw new ActiveProductDeleteError();
  db.delete(product).where(eq(product.id, id)).run();
  if (p.photoUri) deletePhotoIfUnused(db, p.photoUri, deleteFile);
}

/** True while any product (active or archived) still shows this photo file. */
export function photoInUse(db: Db, uri: string): boolean {
  const row = db.select({ n: count() }).from(product).where(eq(product.photoUri, uri)).get();
  return (row?.n ?? 0) > 0;
}

/** Deletes a photo file nobody uses any more. A failure leaves an orphaned file at worst. */
export function deletePhotoIfUnused(db: Db, uri: string, deleteFile: DeleteFile): void {
  if (photoInUse(db, uri)) return;
  try {
    deleteFile(uri);
  } catch {
    // A missing or locked file must not undo the save or delete.
  }
}

/** Any product, finished ones included, that has an expiry date (for the reminder ask, P3). */
export function hasProductWithExpiry(db: Db): boolean {
  return (
    db
      .select({ id: product.id })
      .from(product)
      .where(
        or(
          isNotNull(product.expiresAt),
          and(isNotNull(product.openedAt), isNotNull(product.paoMonths)),
        ),
      )
      .limit(1)
      .all().length > 0
  );
}

export type AvoidContext = {
  items: AvoidItemLite[];
  /** Ingredient id → group id, for group avoid items. */
  groupOf: Map<number, number | null>;
};

/** What the product form needs to warn about avoided ingredients before saving (P3). */
export function avoidContext(db: Db): AvoidContext {
  const items: AvoidItemLite[] = db
    .select({ id: avoidItem.id, kind: avoidItem.kind, refId: avoidItem.refId })
    .from(avoidItem)
    .all();
  const groupOf = new Map<number, number | null>();
  if (items.length > 0) {
    for (const i of db
      .select({ id: ingredient.id, groupId: ingredient.groupId })
      .from(ingredient)
      .all()) {
      groupOf.set(i.id, i.groupId);
    }
  }
  return { items, groupOf };
}

/** Copies a product and its ingredients as a new purchase today (P2 Duplicate). */
export function duplicateProduct(db: Db, id: number, today: string): number {
  return db.transaction((tx) => {
    const p = tx.select().from(product).where(eq(product.id, id)).get();
    if (!p) throw new Error(`Product ${id} not found`);
    const { id: newId } = tx
      .insert(product)
      .values({
        name: p.name,
        brand: p.brand,
        area: p.area,
        category: p.category,
        photoUri: p.photoUri,
        size: p.size,
        unit: p.unit,
        priceCents: p.priceCents,
        purchasedAt: today,
        expiresAt: p.expiresAt,
        openedAt: null,
        paoMonths: p.paoMonths,
        notes: null,
        rating: null,
        wouldRebuy: null,
        archivedAt: null,
      })
      .returning({ id: product.id })
      .get();
    const links = tx
      .select()
      .from(productIngredient)
      .where(eq(productIngredient.productId, id))
      .all();
    if (links.length > 0) {
      tx.insert(productIngredient)
        .values(
          links.map((l) => ({
            productId: newId,
            ingredientId: l.ingredientId,
            position: l.position,
          })),
        )
        .run();
    }
    return newId;
  });
}

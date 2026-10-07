import { and, asc, count, eq, inArray, isNotNull, isNull, lt } from 'drizzle-orm';

import type { Db } from '@/db';
import type { ShoppingList } from '@/db/enums';
import { product, shoppingDismissal, shoppingItem } from '@/db/schema';
import type { ShoppingItem } from '@/db/schema';
import { addDays } from '@/lib/appDay';
import { daysLeft, effectiveExpiry, expiryStatus } from '@/lib/expiry';
import { normalizeName } from '@/lib/text';
import { productIngredients } from '@/features/products/repo';
import type { ProductFormValues } from '@/features/products/schema';

import type {
  NewShoppingItemInput,
  ShoppingAreaFilter,
  ShoppingPickerProduct,
  ShoppingRowItem,
  ShoppingSections,
  Suggestion,
} from './types';

/** Bought rows leave the list this long after they were ticked (spec P6). */
export const BOUGHT_KEEP_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Finished products are suggested for this many days after they were finished. */
export const FINISHED_SUGGEST_DAYS = 90;

function matchesArea(area: ShoppingRowItem['area'], filter: ShoppingAreaFilter): boolean {
  if (filter === 'all') return true;
  return area === filter || area === 'both';
}

/** Every item joined with its product (when linked). */
function rows(db: Db): ShoppingRowItem[] {
  const found = db
    .select({ item: shoppingItem, product })
    .from(shoppingItem)
    .leftJoin(product, eq(shoppingItem.productId, product.id))
    .orderBy(asc(shoppingItem.createdAt), asc(shoppingItem.id))
    .all();
  return found.map(({ item, product: p }) => ({
    id: item.id,
    productId: item.productId,
    name: item.name,
    brand: item.brand,
    area: p?.area ?? item.area,
    note: item.note,
    list: item.list,
    boughtAt: item.boughtAt,
    createdAt: item.createdAt,
    category: p?.category ?? null,
    priceCents: p?.priceCents ?? null,
    size: p?.size ?? null,
    unit: p?.unit ?? null,
    rating: p?.rating ?? null,
    wouldRebuy: p?.wouldRebuy ?? null,
    // Once Add product saves the new bottle, the item links to it (created after the tick).
    needsProduct: item.boughtAt !== null && (p === null || p.createdAt < item.boughtAt),
  }));
}

/**
 * The P6 sections. `area` filters To buy (its All / Skin / Hair chips); Skin and Hair include
 * Both. To buy and Want to try keep the order items were added; Bought is newest first.
 */
export function listShopping(db: Db, area: ShoppingAreaFilter = 'all'): ShoppingSections {
  const all = rows(db);
  const open = all.filter((i) => i.boughtAt === null);
  return {
    toBuy: open.filter((i) => i.list === 'to_buy' && matchesArea(i.area, area)),
    wantToTry: open.filter((i) => i.list === 'want_to_try'),
    bought: all
      .filter((i) => i.boughtAt !== null)
      .sort((a, b) => (b.boughtAt ?? 0) - (a.boughtAt ?? 0) || b.id - a.id),
  };
}

export function getItem(db: Db, id: number): ShoppingItem | null {
  return db.select().from(shoppingItem).where(eq(shoppingItem.id, id)).get() ?? null;
}

/**
 * Buy again: a linked To buy item for the product, unless one is already open (not bought) for
 * it; then that one is returned and nothing is added.
 */
export function addBuyAgain(db: Db, productId: number): { id: number; created: boolean } | null {
  const p = db.select().from(product).where(eq(product.id, productId)).get();
  if (!p) return null;
  const open = db
    .select({ id: shoppingItem.id })
    .from(shoppingItem)
    .where(and(eq(shoppingItem.productId, productId), isNull(shoppingItem.boughtAt)))
    .get();
  if (open) return { id: open.id, created: false };
  const inserted = db
    .insert(shoppingItem)
    .values({ productId, name: p.name, brand: p.brand, area: p.area, list: 'to_buy' })
    .returning({ id: shoppingItem.id })
    .get();
  return { id: inserted.id, created: true };
}

/** A new free-text item (P7 New item). */
export function addItem(db: Db, input: NewShoppingItemInput): number {
  return db
    .insert(shoppingItem)
    .values({
      name: input.name,
      brand: input.brand,
      area: input.area,
      list: input.list,
      note: input.note,
    })
    .returning({ id: shoppingItem.id })
    .get().id;
}

export function updateItem(db: Db, id: number, patch: Partial<NewShoppingItemInput>): void {
  db.update(shoppingItem).set(patch).where(eq(shoppingItem.id, id)).run();
}

/** Deletes an item and returns its row for Undo (`restoreItems`). */
export function deleteItem(db: Db, id: number): ShoppingItem | null {
  const row = getItem(db, id);
  if (row) db.delete(shoppingItem).where(eq(shoppingItem.id, id)).run();
  return row;
}

/** Removes several items at once (Undo for Buy again). */
export function deleteItems(db: Db, ids: readonly number[]): void {
  if (ids.length === 0) return;
  db.delete(shoppingItem)
    .where(inArray(shoppingItem.id, [...ids]))
    .run();
}

/** "Move to To buy" for Want to try items (and back). */
export function moveToList(db: Db, id: number, list: ShoppingList): void {
  db.update(shoppingItem).set({ list }).where(eq(shoppingItem.id, id)).run();
}

/**
 * Ticks (`at` = epoch ms) or unticks (`null`) an item. Ticking a linked item also dismisses its
 * product from Suggested: it has been bought again, so it should not come back once the bought
 * row leaves the list.
 */
export function setBought(db: Db, id: number, at: number | null): void {
  db.transaction((tx) => {
    tx.update(shoppingItem).set({ boughtAt: at }).where(eq(shoppingItem.id, id)).run();
    if (at === null) return;
    const row = tx
      .select({ productId: shoppingItem.productId })
      .from(shoppingItem)
      .where(eq(shoppingItem.id, id))
      .get();
    if (row?.productId != null) {
      tx.insert(shoppingDismissal)
        .values({ productId: row.productId, dismissedAt: at })
        .onConflictDoNothing()
        .run();
    }
  });
}

/** Links a bought item to the product just made from it, so its "Add it to your products" line goes. */
export function linkItemToProduct(db: Db, id: number, productId: number): void {
  db.update(shoppingItem).set({ productId }).where(eq(shoppingItem.id, id)).run();
}

/** Clear bought: deletes every bought row and returns them for Undo. */
export function clearBought(db: Db): ShoppingItem[] {
  return db.transaction((tx) => {
    const bought = tx.select().from(shoppingItem).where(isNotNull(shoppingItem.boughtAt)).all();
    tx.delete(shoppingItem).where(isNotNull(shoppingItem.boughtAt)).run();
    return bought;
  });
}

/** Undo for Clear bought and Delete: puts the rows back with their ids. */
export function restoreItems(db: Db, items: readonly ShoppingItem[]): void {
  if (items.length === 0) return;
  db.transaction((tx) => {
    const linked = items.map((i) => i.productId).filter((id): id is number => id !== null);
    const existing = new Set(
      linked.length === 0
        ? []
        : tx
            .select({ id: product.id })
            .from(product)
            .where(inArray(product.id, linked))
            .all()
            .map((p) => p.id),
    );
    for (const item of items) {
      tx.insert(shoppingItem)
        .values({
          ...item,
          // The product may have been deleted meanwhile.
          productId:
            item.productId !== null && existing.has(item.productId) ? item.productId : null,
        })
        .onConflictDoNothing()
        .run();
    }
  });
}

/** Deletes bought rows ticked more than 30 days ago; run on app open. Returns how many. */
export function purgeOldBought(db: Db, now: number): number {
  const cutoff = now - BOUGHT_KEEP_DAYS * DAY_MS;
  return db
    .delete(shoppingItem)
    .where(and(isNotNull(shoppingItem.boughtAt), lt(shoppingItem.boughtAt, cutoff)))
    .returning({ id: shoppingItem.id })
    .all().length;
}

/**
 * Suggested: finished products (within the last 90 days) and expiring or expired active ones
 * that are not on the list, not dismissed and not marked "Would buy again: No". Expired and
 * expiring first (soonest first), then finished (newest first).
 */
export function suggestions(db: Db, today: string, warnDays: number): Suggestion[] {
  const listed = new Set(
    db
      .select({ productId: shoppingItem.productId })
      .from(shoppingItem)
      .where(isNotNull(shoppingItem.productId))
      .all()
      .map((r) => r.productId),
  );
  const dismissed = new Set(
    db
      .select({ productId: shoppingDismissal.productId })
      .from(shoppingDismissal)
      .all()
      .map((r) => r.productId),
  );
  const finishedSince = addDays(today, -FINISHED_SUGGEST_DAYS);
  const expiring: (Suggestion & { order: number })[] = [];
  const finished: (Suggestion & { order: string })[] = [];

  for (const p of db.select().from(product).all()) {
    if (listed.has(p.id) || dismissed.has(p.id) || p.wouldRebuy === false) continue;
    const base = {
      productId: p.id,
      name: p.name,
      brand: p.brand,
      area: p.area,
      rating: p.rating,
      wouldRebuy: p.wouldRebuy,
    };
    if (p.archivedAt) {
      if (p.archivedAt >= finishedSince) {
        finished.push({
          ...base,
          reason: { kind: 'finished', day: p.archivedAt },
          order: p.archivedAt,
        });
      }
      continue;
    }
    const status = expiryStatus(p, today, warnDays);
    const eff = effectiveExpiry(p);
    const left = daysLeft(p, today);
    if (eff === null || left === null) continue;
    if (status === 'expired') {
      expiring.push({ ...base, reason: { kind: 'expired', day: eff }, order: left });
    } else if (status === 'expiring') {
      expiring.push({
        ...base,
        reason: { kind: 'expiring', day: eff, daysLeft: left },
        order: left,
      });
    }
  }

  expiring.sort((a, b) => a.order - b.order || a.productId - b.productId);
  finished.sort((a, b) => b.order.localeCompare(a.order) || b.productId - a.productId);
  return [...expiring, ...finished].map(({ order: _order, ...s }) => s);
}

export function dismissSuggestion(db: Db, productId: number, now: number = Date.now()): void {
  db.insert(shoppingDismissal).values({ productId, dismissedAt: now }).onConflictDoNothing().run();
}

/** Open To buy items: the segment badge and Today's "Shopping list · 3 to buy" row. */
export function toBuyCount(db: Db): number {
  return (
    db
      .select({ n: count() })
      .from(shoppingItem)
      .where(and(eq(shoppingItem.list, 'to_buy'), isNull(shoppingItem.boughtAt)))
      .get()?.n ?? 0
  );
}

function sizeText(size: number): string {
  return String(size).replace('.', ',');
}

/**
 * Add product values for a bought item (P3 short form `prefill`): name, brand, category, area,
 * size, unit and ingredients from the item and its product, purchase date today; expiry and
 * opened dates left empty.
 */
export function prefillFromItem(
  db: Db,
  id: number,
  today: string,
): Partial<ProductFormValues> | null {
  const item = getItem(db, id);
  if (!item) return null;
  const p =
    item.productId !== null
      ? db.select().from(product).where(eq(product.id, item.productId)).get()
      : undefined;
  const values: Partial<ProductFormValues> = {
    name: item.name,
    brand: item.brand ?? p?.brand ?? '',
    category: p?.category ?? 'other',
    purchasedAt: today,
    openedAt: null,
    expiresAt: null,
    paoMonths: '',
    ingredients: p
      ? productIngredients(db, p.id)
          .map((i) => i.name)
          .join('\n')
      : '',
  };
  const area = p?.area ?? item.area;
  if (area) values.area = area;
  if (p?.size != null) {
    values.size = sizeText(p.size);
    values.unit = p.unit ?? 'ml';
  }
  return values;
}

/** i18n `t` as the repository needs it. */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

/** "400 ml" in the list's language ("12,5 ml" in LT). */
export function formatSize(
  size: number,
  unit: string | null,
  t: Translate,
  locale?: string,
): string {
  let n: string;
  try {
    n = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(size);
  } catch {
    n = String(size);
  }
  return unit ? `${n} ${t(`products.detail.units.${unit}`)}` : n;
}

/** The list as plain text for the share sheet, grouped by To buy and Want to try. */
export function shareText(db: Db, t: Translate, locale?: string): string {
  const { toBuy, wantToTry } = listShopping(db, 'all');
  const line = (i: ShoppingRowItem) => {
    let text = `• ${i.name}`;
    if (i.brand) text += ` (${i.brand})`;
    if (i.size != null) text += `, ${formatSize(i.size, i.unit, t, locale)}`;
    if (i.note) text += `\n  ${i.note}`;
    return text;
  };
  const groups: string[] = [];
  if (toBuy.length > 0) groups.push([t('shopping.toBuy'), ...toBuy.map(line)].join('\n'));
  if (wantToTry.length > 0)
    groups.push([t('shopping.wantToTry'), ...wantToTry.map(line)].join('\n'));
  return groups.join('\n\n');
}

/** P7 Buy again picker: every product, active and finished, A–Z; search matches name or brand. */
export function pickerProducts(db: Db, search: string, locale?: string): ShoppingPickerProduct[] {
  const q = normalizeName(search);
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
  return db
    .select()
    .from(product)
    .all()
    .filter(
      (p) =>
        q === '' ||
        normalizeName(p.name).includes(q) ||
        (p.brand !== null && normalizeName(p.brand).includes(q)),
    )
    .map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      area: p.area,
      finished: p.archivedAt !== null,
    }))
    .sort((a, b) => Number(a.finished) - Number(b.finished) || collator.compare(a.name, b.name));
}

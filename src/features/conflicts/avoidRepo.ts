import { and, asc, eq, isNull } from 'drizzle-orm';

import type { Db, DbOrTx } from '@/db';
import type { RefKind } from '@/db/enums';
import {
  avoidItem,
  ingredient,
  ingredientGroup,
  product,
  productIngredient,
  type AvoidItem,
} from '@/db/schema';
import { listProducts } from '@/features/products/repo';
import { defaultProductFilters, type ProductListItem } from '@/features/products/types';
import { tidy } from '@/lib/text';

import { EmptyNameError, ensureIngredient } from './repo';

/** The personal avoid list (spec S4). */

export const AVOID_NOTE_MAX = 60;

export type AvoidListItem = {
  id: number;
  kind: RefKind;
  refId: number;
  /** The ingredient's or group's name. */
  name: string;
  note: string | null;
  /** Products in use (not finished) that contain it: "in 1 product". */
  productCount: number;
};

export type AvoidInput = { kind: RefKind; refId: number; note?: string | null };

export class AvoidTargetMissingError extends Error {
  constructor() {
    super('The ingredient or group no longer exists');
    this.name = 'AvoidTargetMissingError';
  }
}

const cleanNote = (note: string | null | undefined) =>
  tidy(note ?? '').slice(0, AVOID_NOTE_MAX) || null;

function refName(db: DbOrTx, kind: RefKind, refId: number): string | null {
  const row =
    kind === 'ingredient'
      ? db.select({ name: ingredient.name }).from(ingredient).where(eq(ingredient.id, refId)).get()
      : db
          .select({ name: ingredientGroup.name })
          .from(ingredientGroup)
          .where(eq(ingredientGroup.id, refId))
          .get();
  return row?.name ?? null;
}

/** Each product in use with its ingredient ids and their groups. */
function activeProductTokens(db: DbOrTx): { ingredients: Set<number>; groups: Set<number> }[] {
  const byProduct = new Map<number, { ingredients: Set<number>; groups: Set<number> }>();
  for (const l of db
    .select({
      productId: productIngredient.productId,
      ingredientId: productIngredient.ingredientId,
      groupId: ingredient.groupId,
    })
    .from(productIngredient)
    .innerJoin(product, eq(product.id, productIngredient.productId))
    .innerJoin(ingredient, eq(ingredient.id, productIngredient.ingredientId))
    .where(isNull(product.archivedAt))
    .all()) {
    let entry = byProduct.get(l.productId);
    if (!entry) {
      entry = { ingredients: new Set(), groups: new Set() };
      byProduct.set(l.productId, entry);
    }
    entry.ingredients.add(l.ingredientId);
    if (l.groupId != null) entry.groups.add(l.groupId);
  }
  return [...byProduct.values()];
}

/** The list in the order it was made (oldest first), with names and product counts. */
export function listAvoidItems(db: DbOrTx): AvoidListItem[] {
  const rows = db.select().from(avoidItem).orderBy(asc(avoidItem.id)).all();
  if (rows.length === 0) return [];
  const ingredientNames = new Map(
    db
      .select({ id: ingredient.id, name: ingredient.name })
      .from(ingredient)
      .all()
      .map((i) => [i.id, i.name]),
  );
  const groupNames = new Map(
    db
      .select({ id: ingredientGroup.id, name: ingredientGroup.name })
      .from(ingredientGroup)
      .all()
      .map((g) => [g.id, g.name]),
  );
  const products = activeProductTokens(db);
  return rows.flatMap((r) => {
    const name = (r.kind === 'ingredient' ? ingredientNames : groupNames).get(r.refId);
    if (name === undefined) return [];
    const productCount = products.filter((p) =>
      r.kind === 'ingredient' ? p.ingredients.has(r.refId) : p.groups.has(r.refId),
    ).length;
    return [{ id: r.id, kind: r.kind, refId: r.refId, name, note: r.note, productCount }];
  });
}

/**
 * Puts an ingredient or group on the list. Adding one that is already there keeps its place and
 * takes the new note, if one is given. Returns the item id.
 */
export function addAvoidItem(db: DbOrTx, input: AvoidInput): number {
  if (refName(db, input.kind, input.refId) === null) throw new AvoidTargetMissingError();
  const note = cleanNote(input.note);
  const existing = db
    .select({ id: avoidItem.id })
    .from(avoidItem)
    .where(and(eq(avoidItem.kind, input.kind), eq(avoidItem.refId, input.refId)))
    .get();
  if (existing) {
    if (note !== null) {
      db.update(avoidItem).set({ note }).where(eq(avoidItem.id, existing.id)).run();
    }
    return existing.id;
  }
  return db
    .insert(avoidItem)
    .values({ kind: input.kind, refId: input.refId, note })
    .returning({ id: avoidItem.id })
    .get().id;
}

/**
 * Avoids an ingredient typed by name: an existing one (matched ignoring case, accents and spaces)
 * or a new one, which joins the ingredient list. Returns the item id.
 */
export function addAvoidIngredientByName(db: Db, name: string, note?: string | null): number {
  const display = tidy(name);
  if (!display) throw new EmptyNameError();
  return db.transaction((tx) => {
    const { id } = ensureIngredient(tx, display);
    return addAvoidItem(tx, { kind: 'ingredient', refId: id, note });
  });
}

/** Removes an item and returns the row as it was, for Undo; null when it was already gone. */
export function removeAvoidItem(db: DbOrTx, id: number): AvoidItem | null {
  const row = db.select().from(avoidItem).where(eq(avoidItem.id, id)).get();
  if (!row) return null;
  db.delete(avoidItem).where(eq(avoidItem.id, id)).run();
  return row;
}

/**
 * Undo: puts a removed row back with its own id, so it returns to the same place. Nothing happens
 * when its ingredient or group is gone, or the same one was added again in the meantime.
 */
export function restoreAvoidItem(db: DbOrTx, row: AvoidItem): void {
  if (refName(db, row.kind, row.refId) === null) return;
  const taken = db
    .select({ id: avoidItem.id })
    .from(avoidItem)
    .where(and(eq(avoidItem.kind, row.kind), eq(avoidItem.refId, row.refId)))
    .get();
  if (taken) return;
  db.insert(avoidItem).values(row).onConflictDoNothing().run();
}

/** Products in use that contain an avoided ingredient or group, by name (S4 "Products that contain these"). */
export function productsWithAvoided(
  db: Db,
  today: string,
  warnDays: number,
  locale?: string,
): ProductListItem[] {
  return listProducts(
    db,
    { ...defaultProductFilters, avoidOnly: true, sort: 'name' },
    today,
    warnDays,
    locale,
  );
}

import type { Db } from '@/db';
import { createTestDb } from '@/db/test-db';
import { avoidContext, createProduct, getProduct, markFinished } from '@/features/products/repo';
import type { ProductInput } from '@/features/products/schema';
import { avoidMatches } from '@/lib/avoid';

import {
  addAvoidIngredientByName,
  addAvoidItem,
  AvoidTargetMissingError,
  listAvoidItems,
  productsWithAvoided,
  removeAvoidItem,
  restoreAvoidItem,
} from './avoidRepo';
import { deleteGroup, EmptyNameError, listIngredients, saveGroup } from './repo';

const TODAY = '2026-10-07';

const productInput = (over: Partial<ProductInput> = {}): ProductInput => ({
  name: 'Cream',
  brand: null,
  area: 'skin',
  category: 'other',
  size: null,
  unit: null,
  price: null,
  purchasedAt: null,
  expiresAt: null,
  openedAt: null,
  paoMonths: null,
  notes: null,
  photoUri: null,
  ingredients: [],
  ...over,
});

const idOf = (db: Db, name: string) => listIngredients(db).find((i) => i.name === name)!.id;

let db: ReturnType<typeof createTestDb>;
beforeEach(() => {
  db = createTestDb();
});

/** Two lotions with parfum, a toner with glycolic acid, and a finished cream with parfum. */
function seed() {
  const lotion = createProduct(db, productInput({ name: 'Body lotion', ingredients: ['Parfum'] }));
  const mist = createProduct(
    db,
    productInput({ name: 'Face mist', ingredients: ['Water', 'Parfum'] }),
  );
  const toner = createProduct(
    db,
    productInput({ name: 'AHA toner', ingredients: ['Glycolic acid'] }),
  );
  const old = createProduct(db, productInput({ name: 'Old cream', ingredients: ['Parfum'] }));
  markFinished(db, old, TODAY);
  return { lotion, mist, toner, old };
}

describe('avoid list', () => {
  it('starts empty', () => {
    expect(listAvoidItems(db)).toEqual([]);
  });

  it('lists ingredients and groups with notes and counts of products in use', () => {
    seed();
    const acids = saveGroup(db, { name: 'Acids', memberIds: [idOf(db, 'Glycolic acid')] });
    addAvoidItem(db, { kind: 'ingredient', refId: idOf(db, 'Parfum'), note: '  allergic ' });
    addAvoidItem(db, { kind: 'group', refId: acids });
    addAvoidIngredientByName(db, 'Linalool');
    expect(listAvoidItems(db)).toMatchObject([
      { kind: 'ingredient', name: 'Parfum', note: 'allergic', productCount: 2 },
      { kind: 'group', name: 'Acids', note: null, productCount: 1 },
      { kind: 'ingredient', name: 'Linalool', note: null, productCount: 0 },
    ]);
  });

  it('adds by typed name: an existing ingredient or a new one', () => {
    seed();
    const parfum = idOf(db, 'Parfum');
    const id = addAvoidIngredientByName(db, ' PARFUM ', 'itchy');
    expect(listAvoidItems(db)).toMatchObject([{ id, refId: parfum, note: 'itchy' }]);
    addAvoidIngredientByName(db, 'Limonene');
    expect(listIngredients(db).some((i) => i.name === 'Limonene')).toBe(true);
    expect(() => addAvoidIngredientByName(db, '   ')).toThrow(EmptyNameError);
  });

  it('keeps one entry per ingredient or group; adding again only updates the note', () => {
    seed();
    const parfum = idOf(db, 'Parfum');
    const first = addAvoidItem(db, { kind: 'ingredient', refId: parfum, note: 'allergic' });
    expect(addAvoidItem(db, { kind: 'ingredient', refId: parfum })).toBe(first);
    expect(listAvoidItems(db)).toMatchObject([{ note: 'allergic' }]);
    addAvoidItem(db, { kind: 'ingredient', refId: parfum, note: 'rash' });
    expect(listAvoidItems(db)).toHaveLength(1);
    expect(listAvoidItems(db)[0]!.note).toBe('rash');
  });

  it('cuts long notes and refuses a missing ingredient or group', () => {
    seed();
    addAvoidItem(db, { kind: 'ingredient', refId: idOf(db, 'Water'), note: 'x'.repeat(100) });
    expect(listAvoidItems(db)[0]!.note).toHaveLength(60);
    expect(() => addAvoidItem(db, { kind: 'group', refId: 999 })).toThrow(AvoidTargetMissingError);
  });

  it('removes an entry and Undo puts it back in the same place', () => {
    seed();
    const a = addAvoidItem(db, { kind: 'ingredient', refId: idOf(db, 'Parfum'), note: 'allergic' });
    addAvoidItem(db, { kind: 'ingredient', refId: idOf(db, 'Water') });
    addAvoidItem(db, { kind: 'ingredient', refId: idOf(db, 'Glycolic acid') });
    const removed = removeAvoidItem(db, a)!;
    expect(removed).toMatchObject({ id: a, note: 'allergic' });
    expect(listAvoidItems(db).map((i) => i.name)).toEqual(['Water', 'Glycolic acid']);
    expect(removeAvoidItem(db, a)).toBeNull();
    restoreAvoidItem(db, removed);
    expect(listAvoidItems(db).map((i) => i.name)).toEqual(['Parfum', 'Water', 'Glycolic acid']);
    expect(listAvoidItems(db)[0]).toMatchObject({ id: a, note: 'allergic' });
  });

  it('does not restore over a re-added entry or a deleted group', () => {
    seed();
    const parfum = idOf(db, 'Parfum');
    const removed = removeAvoidItem(db, addAvoidItem(db, { kind: 'ingredient', refId: parfum }))!;
    addAvoidItem(db, { kind: 'ingredient', refId: parfum, note: 'again' });
    restoreAvoidItem(db, removed);
    expect(listAvoidItems(db)).toMatchObject([{ note: 'again' }]);

    const g = saveGroup(db, { name: 'Scents', memberIds: [parfum] });
    const gone = removeAvoidItem(db, addAvoidItem(db, { kind: 'group', refId: g }))!;
    deleteGroup(db, g);
    restoreAvoidItem(db, gone);
    expect(listAvoidItems(db).map((i) => i.kind)).toEqual(['ingredient']);
  });

  it('lists the products in use that contain an avoided item, by name', () => {
    const { lotion, mist, toner } = seed();
    expect(productsWithAvoided(db, TODAY, 30)).toEqual([]);
    const acids = saveGroup(db, { name: 'Acids', memberIds: [idOf(db, 'Glycolic acid')] });
    addAvoidItem(db, { kind: 'group', refId: acids });
    addAvoidItem(db, { kind: 'ingredient', refId: idOf(db, 'Parfum') });
    const items = productsWithAvoided(db, TODAY, 30);
    expect(items.map((p) => p.id)).toEqual([toner, lotion, mist]);
    expect(items.every((p) => p.avoid)).toBe(true);
  });

  it('a group entry marks every product with a member ingredient (P1, P2, P3)', () => {
    const { toner } = seed();
    const bha = createProduct(db, productInput({ name: 'BHA', ingredients: ['Salicylic acid'] }));
    const acids = saveGroup(db, {
      name: 'Acids',
      memberIds: [idOf(db, 'Glycolic acid'), idOf(db, 'Salicylic acid')],
    });
    addAvoidItem(db, { kind: 'group', refId: acids });
    expect(getProduct(db, toner, TODAY, 30)!.avoid).toBe(true);
    expect(getProduct(db, bha, TODAY, 30)!.avoid).toBe(true);
    const ctx = avoidContext(db);
    expect(avoidMatches([idOf(db, 'Salicylic acid')], ctx.groupOf, ctx.items)).toHaveLength(1);
    expect(avoidMatches([idOf(db, 'Water')], ctx.groupOf, ctx.items)).toHaveLength(0);
  });
});

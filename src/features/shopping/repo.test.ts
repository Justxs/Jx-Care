import { eq } from 'drizzle-orm';

import { createTestDb } from '@/db/test-db';
import { product, shoppingItem } from '@/db/schema';
import { createProduct, deleteProduct, markFinished } from '@/features/products/repo';
import type { ProductInput } from '@/features/products/schema';

import {
  addBuyAgain,
  addItem,
  clearBought,
  deleteItem,
  deleteItems,
  dismissSuggestion,
  linkItemToProduct,
  listShopping,
  moveToList,
  pickerProducts,
  prefillFromItem,
  purgeOldBought,
  restoreItems,
  setBought,
  shareText,
  suggestions,
  toBuyCount,
  updateItem,
  type Translate,
} from './repo';

const TODAY = '2026-10-07';
const WARN = 30;
const NOW = Date.UTC(2026, 9, 7, 12);
const DAY = 24 * 60 * 60 * 1000;

const input = (over: Partial<ProductInput> = {}): ProductInput => ({
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

const newItem = (name: string, over: Partial<Parameters<typeof addItem>[1]> = {}) => ({
  name,
  brand: null,
  area: null,
  list: 'to_buy' as const,
  note: null,
  ...over,
});

const t: Translate = (key) =>
  ({
    'shopping.toBuy': 'To buy',
    'shopping.wantToTry': 'Want to try',
    'products.detail.units.ml': 'ml',
    'products.detail.units.g': 'g',
  })[key] ?? key;

describe('addBuyAgain', () => {
  it('adds a linked To buy item with the product name, brand and area', () => {
    const db = createTestDb();
    const id = createProduct(db, input({ name: 'Serum', brand: 'Acme', area: 'both' }));
    const added = addBuyAgain(db, id);
    expect(added?.created).toBe(true);
    const { toBuy } = listShopping(db);
    expect(toBuy).toHaveLength(1);
    expect(toBuy[0]).toMatchObject({
      productId: id,
      name: 'Serum',
      brand: 'Acme',
      area: 'both',
      list: 'to_buy',
    });
  });

  it("doesn't duplicate an open item, but adds again once the old one is bought", () => {
    const db = createTestDb();
    const id = createProduct(db, input());
    const first = addBuyAgain(db, id)!;
    const second = addBuyAgain(db, id)!;
    expect(second).toEqual({ id: first.id, created: false });
    expect(toBuyCount(db)).toBe(1);

    setBought(db, first.id, NOW);
    const third = addBuyAgain(db, id)!;
    expect(third.created).toBe(true);
    expect(third.id).not.toBe(first.id);
  });

  it('returns null for a missing product', () => {
    expect(addBuyAgain(createTestDb(), 99)).toBeNull();
  });
});

describe('listShopping', () => {
  it('sorts items into To buy, Want to try and Bought, with the linked product details', () => {
    const db = createTestDb();
    const id = createProduct(
      db,
      input({ name: 'Lotion', price: 1250, size: 200, unit: 'ml', area: 'skin' }),
    );
    db.update(product).set({ rating: 4, wouldRebuy: true }).where(eq(product.id, id)).run();
    const linked = addBuyAgain(db, id)!.id;
    const idea = addItem(db, newItem('Hair oil', { list: 'want_to_try', area: 'hair' }));
    const done = addItem(db, newItem('Soap'));
    setBought(db, done, NOW);

    const s = listShopping(db);
    expect(s.toBuy.map((i) => i.id)).toEqual([linked]);
    expect(s.toBuy[0]).toMatchObject({
      priceCents: 1250,
      size: 200,
      unit: 'ml',
      rating: 4,
      wouldRebuy: true,
      needsProduct: false,
    });
    expect(s.wantToTry.map((i) => i.id)).toEqual([idea]);
    expect(s.bought.map((i) => i.id)).toEqual([done]);
    expect(s.bought[0]?.needsProduct).toBe(true);
  });

  it('filters To buy by area, with Both in Skin and Hair', () => {
    const db = createTestDb();
    addItem(db, newItem('Skin thing', { area: 'skin' }));
    addItem(db, newItem('Hair thing', { area: 'hair' }));
    addItem(db, newItem('Both thing', { area: 'both' }));
    addItem(db, newItem('No area'));
    const names = (area: 'all' | 'skin' | 'hair') =>
      listShopping(db, area).toBuy.map((i) => i.name);
    expect(names('all')).toEqual(['Skin thing', 'Hair thing', 'Both thing', 'No area']);
    expect(names('skin')).toEqual(['Skin thing', 'Both thing']);
    expect(names('hair')).toEqual(['Hair thing', 'Both thing']);
  });

  it('lists bought items newest first', () => {
    const db = createTestDb();
    const a = addItem(db, newItem('A'));
    const b = addItem(db, newItem('B'));
    setBought(db, a, NOW - DAY);
    setBought(db, b, NOW);
    expect(listShopping(db).bought.map((i) => i.name)).toEqual(['B', 'A']);
  });
});

describe('editing items', () => {
  it('updates, moves, unticks and deletes', () => {
    const db = createTestDb();
    const id = addItem(db, newItem('Mask', { list: 'want_to_try' }));
    updateItem(db, id, { name: 'Clay mask', note: 'The green one' });
    moveToList(db, id, 'to_buy');
    expect(listShopping(db).toBuy[0]).toMatchObject({ name: 'Clay mask', note: 'The green one' });

    setBought(db, id, NOW);
    expect(toBuyCount(db)).toBe(0);
    setBought(db, id, null);
    expect(toBuyCount(db)).toBe(1);

    const row = deleteItem(db, id);
    expect(listShopping(db).toBuy).toHaveLength(0);
    restoreItems(db, [row!]);
    expect(listShopping(db).toBuy.map((i) => i.id)).toEqual([id]);

    deleteItems(db, [id]);
    expect(toBuyCount(db)).toBe(0);
  });

  it('counts only open To buy items', () => {
    const db = createTestDb();
    addItem(db, newItem('A'));
    addItem(db, newItem('B'));
    addItem(db, newItem('Idea', { list: 'want_to_try' }));
    setBought(db, addItem(db, newItem('C')), NOW);
    expect(toBuyCount(db)).toBe(2);
  });
});

describe('clearBought and restoreItems', () => {
  it('clears every bought row and Undo puts them back as they were', () => {
    const db = createTestDb();
    const pid = createProduct(db, input({ name: 'Toner' }));
    const linked = addBuyAgain(db, pid)!.id;
    const free = addItem(db, newItem('Cotton pads', { note: 'Big pack' }));
    const open = addItem(db, newItem('Still to buy'));
    setBought(db, linked, NOW - DAY);
    setBought(db, free, NOW);

    const before = db.select().from(shoppingItem).all();
    const cleared = clearBought(db);
    expect(cleared.map((r) => r.id).sort()).toEqual([linked, free].sort());
    expect(listShopping(db).bought).toHaveLength(0);
    expect(listShopping(db).toBuy.map((i) => i.id)).toEqual([open]);

    restoreItems(db, cleared);
    expect(db.select().from(shoppingItem).all()).toEqual(before);
  });

  it('restores a row unlinked when its product was deleted meanwhile', () => {
    const db = createTestDb();
    const pid = createProduct(db, input({ name: 'Toner' }));
    const linked = addBuyAgain(db, pid)!.id;
    setBought(db, linked, NOW);
    const cleared = clearBought(db);
    markFinished(db, pid, TODAY);
    deleteProduct(db, pid, () => {});
    restoreItems(db, cleared);
    expect(listShopping(db).bought[0]).toMatchObject({ id: linked, productId: null });
  });
});

describe('purgeOldBought', () => {
  it('deletes bought rows older than 30 days and keeps the rest', () => {
    const db = createTestDb();
    const old = addItem(db, newItem('Old'));
    const edge = addItem(db, newItem('Edge'));
    const recent = addItem(db, newItem('Recent'));
    const open = addItem(db, newItem('Open'));
    setBought(db, old, NOW - 31 * DAY);
    setBought(db, edge, NOW - 30 * DAY);
    setBought(db, recent, NOW - 2 * DAY);

    expect(purgeOldBought(db, NOW)).toBe(1);
    const ids = db
      .select({ id: shoppingItem.id })
      .from(shoppingItem)
      .all()
      .map((r) => r.id)
      .sort((a, b) => a - b);
    expect(ids).toEqual([edge, recent, open]);
  });
});

describe('suggestions', () => {
  it('suggests finished and expiring products with why, soonest expiry first', () => {
    const db = createTestDb();
    createProduct(db, input({ name: 'Fine', openedAt: '2026-09-01', paoMonths: 12 }));
    const soon = createProduct(db, input({ name: 'Soon', expiresAt: '2026-10-16' }));
    const gone = createProduct(db, input({ name: 'Gone', expiresAt: '2026-10-02' }));
    const done = createProduct(db, input({ name: 'Done' }));
    markFinished(db, done, '2026-10-02');
    const longAgo = createProduct(db, input({ name: 'Long ago' }));
    markFinished(db, longAgo, '2026-01-02');

    expect(suggestions(db, TODAY, WARN)).toEqual([
      {
        productId: gone,
        name: 'Gone',
        brand: null,
        area: 'skin',
        reason: { kind: 'expired', day: '2026-10-02' },
        rating: null,
        wouldRebuy: null,
      },
      {
        productId: soon,
        name: 'Soon',
        brand: null,
        area: 'skin',
        reason: { kind: 'expiring', day: '2026-10-16', daysLeft: 9 },
        rating: null,
        wouldRebuy: null,
      },
      {
        productId: done,
        name: 'Done',
        brand: null,
        area: 'skin',
        reason: { kind: 'finished', day: '2026-10-02' },
        rating: null,
        wouldRebuy: null,
      },
    ]);
  });

  it('leaves out listed, dismissed and "Would buy again: No" products', () => {
    const db = createTestDb();
    const listed = createProduct(db, input({ name: 'Listed' }));
    const dismissed = createProduct(db, input({ name: 'Dismissed' }));
    const no = createProduct(db, input({ name: 'No' }));
    const yes = createProduct(db, input({ name: 'Yes' }));
    const unrated = createProduct(db, input({ name: 'Unrated' }));
    for (const id of [listed, dismissed, no, yes, unrated]) markFinished(db, id, '2026-10-01');
    db.update(product).set({ wouldRebuy: false }).where(eq(product.id, no)).run();
    db.update(product).set({ wouldRebuy: true }).where(eq(product.id, yes)).run();
    addBuyAgain(db, listed);
    dismissSuggestion(db, dismissed);
    dismissSuggestion(db, dismissed);

    expect(suggestions(db, TODAY, WARN).map((s) => s.name)).toEqual(['Unrated', 'Yes']);
  });

  it('stays away once the item is bought, even after the bought row leaves the list', () => {
    const db = createTestDb();
    const id = createProduct(db, input({ name: 'Serum' }));
    markFinished(db, id, '2026-10-01');
    const item = addBuyAgain(db, id)!.id;
    deleteItem(db, item);
    expect(suggestions(db, TODAY, WARN).map((s) => s.name)).toEqual(['Serum']);

    const again = addBuyAgain(db, id)!.id;
    setBought(db, again, NOW);
    clearBought(db);
    expect(suggestions(db, TODAY, WARN)).toEqual([]);
  });
});

describe('prefillFromItem', () => {
  it('copies name, brand, category, area, size, unit and ingredients; purchase date today', () => {
    const db = createTestDb();
    const pid = createProduct(
      db,
      input({
        name: 'Body lotion',
        brand: 'Nivea',
        category: 'moisturiser',
        area: 'both',
        size: 400.5,
        unit: 'ml',
        price: 899,
        expiresAt: '2026-12-01',
        openedAt: '2026-09-01',
        paoMonths: 12,
        notes: 'Nice',
        ingredients: ['Aqua', 'Glycerin'],
      }),
    );
    markFinished(db, pid, '2026-10-01');
    const item = addBuyAgain(db, pid)!.id;
    expect(prefillFromItem(db, item, TODAY)).toEqual({
      name: 'Body lotion',
      brand: 'Nivea',
      category: 'moisturiser',
      area: 'both',
      size: '400,5',
      unit: 'ml',
      purchasedAt: TODAY,
      openedAt: null,
      expiresAt: null,
      paoMonths: '',
      ingredients: 'Aqua\nGlycerin',
    });
  });

  it('uses what a free-text item has', () => {
    const db = createTestDb();
    const id = addItem(db, newItem('Shampoo', { brand: 'Acme', area: 'hair' }));
    expect(prefillFromItem(db, id, TODAY)).toEqual({
      name: 'Shampoo',
      brand: 'Acme',
      category: 'other',
      area: 'hair',
      purchasedAt: TODAY,
      openedAt: null,
      expiresAt: null,
      paoMonths: '',
      ingredients: '',
    });
    const noArea = addItem(db, newItem('Thing'));
    expect(prefillFromItem(db, noArea, TODAY)).not.toHaveProperty('area');
    expect(prefillFromItem(db, 999, TODAY)).toBeNull();
  });
});

describe('needsProduct', () => {
  it('goes once the bought item is linked to the product made from it', () => {
    const db = createTestDb();
    const old = createProduct(db, input({ name: 'Serum' }));
    db.update(product)
      .set({ createdAt: NOW - 10 * DAY })
      .where(eq(product.id, old))
      .run();
    const item = addBuyAgain(db, old)!.id;
    setBought(db, item, NOW - DAY);
    expect(listShopping(db).bought[0]?.needsProduct).toBe(true);

    const fresh = createProduct(db, input({ name: 'Serum' }));
    db.update(product).set({ createdAt: NOW }).where(eq(product.id, fresh)).run();
    linkItemToProduct(db, item, fresh);
    expect(listShopping(db).bought[0]?.needsProduct).toBe(false);
  });
});

describe('shareText', () => {
  it('groups To buy and Want to try as plain text and skips bought items', () => {
    const db = createTestDb();
    const pid = createProduct(
      db,
      input({ name: 'Body lotion', brand: 'Nivea', size: 400, unit: 'ml' }),
    );
    addBuyAgain(db, pid);
    addItem(db, newItem('Cotton pads', { note: 'Big pack' }));
    addItem(db, newItem('Hair oil', { brand: 'Argan', list: 'want_to_try' }));
    setBought(db, addItem(db, newItem('Soap')), NOW);

    expect(shareText(db, t, 'en')).toBe(
      [
        'To buy',
        '• Body lotion (Nivea), 400 ml',
        '• Cotton pads',
        '  Big pack',
        '',
        'Want to try',
        '• Hair oil (Argan)',
      ].join('\n'),
    );
  });

  it('is empty for an empty list', () => {
    expect(shareText(createTestDb(), t)).toBe('');
  });
});

describe('pickerProducts', () => {
  it('lists active products A–Z, then finished ones, matching name or brand', () => {
    const db = createTestDb();
    createProduct(db, input({ name: 'Toner' }));
    createProduct(db, input({ name: 'cleanser', brand: 'Ąžuolas' }));
    const done = createProduct(db, input({ name: 'Acid' }));
    markFinished(db, done, TODAY);
    expect(pickerProducts(db, '', 'en').map((p) => [p.name, p.finished])).toEqual([
      ['cleanser', false],
      ['Toner', false],
      ['Acid', true],
    ]);
    expect(pickerProducts(db, 'azuo').map((p) => p.name)).toEqual(['cleanser']);
  });
});

import { eq } from 'drizzle-orm';

import { createTestDb } from '@/db/test-db';
import { avoidItem, ingredient, ingredientGroup, product, productIngredient } from '@/db/schema';
import { sortBySoonestExpiry } from '@/lib/expiry';

import {
  ActiveProductDeleteError,
  addUsedInSource,
  brandSuggestions,
  countArchived,
  createProduct,
  deleteProduct,
  duplicateProduct,
  expiringSoon,
  getProduct,
  hasAnyProduct,
  listArchived,
  listKnownIngredients,
  listProducts,
  markFinished,
  markFinishedMany,
  markOpened,
  productsForPicker,
  restoreProduct,
  saveIngredients,
  undoFinished,
  updateProduct,
} from './repo';
import { productSchema, type ProductFormValues, type ProductInput } from './schema';
import { defaultProductFilters, type ProductFilters } from './types';

const TODAY = '2026-10-07';
const WARN = 30;

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

const filters = (over: Partial<ProductFilters> = {}): ProductFilters => ({
  ...defaultProductFilters,
  ...over,
});

const names = (rows: { name: string }[]) => rows.map((r) => r.name);

describe('listProducts', () => {
  it('searches name and brand ignoring accents and case', () => {
    const db = createTestDb();
    createProduct(db, input({ name: 'Ąžuolo kremas' }));
    createProduct(db, input({ name: 'Serum', brand: 'Žalia' }));
    createProduct(db, input({ name: 'Toner' }));
    expect(names(listProducts(db, filters({ search: 'AZUOLO' }), TODAY, WARN))).toEqual([
      'Ąžuolo kremas',
    ]);
    expect(names(listProducts(db, filters({ search: ' zalia ' }), TODAY, WARN))).toEqual(['Serum']);
  });

  it('includes "both" products in the skin and hair filters', () => {
    const db = createTestDb();
    createProduct(db, input({ name: 'Face', area: 'skin' }));
    createProduct(db, input({ name: 'Hair', area: 'hair' }));
    createProduct(db, input({ name: 'Oil', area: 'both' }));
    const sorted = (area: ProductFilters['area']) =>
      names(listProducts(db, filters({ area, sort: 'name' }), TODAY, WARN));
    expect(sorted('skin')).toEqual(['Face', 'Oil']);
    expect(sorted('hair')).toEqual(['Hair', 'Oil']);
    expect(sorted('all')).toEqual(['Face', 'Hair', 'Oil']);
  });

  it('filters by category and computed status, and sorts by expiry like task 006', () => {
    const db = createTestDb();
    createProduct(db, input({ name: 'Expired', expiresAt: '2026-10-01' }));
    createProduct(db, input({ name: 'Soon', expiresAt: '2026-10-20', category: 'serum' }));
    createProduct(
      db,
      input({ name: 'Opened', openedAt: '2026-09-01', paoMonths: 12, category: 'serum' }),
    );
    createProduct(db, input({ name: 'Sealed', expiresAt: '2027-06-01' }));
    createProduct(db, input({ name: 'Nodate' }));

    const all = listProducts(db, filters(), TODAY, WARN);
    expect(names(all)).toEqual(names(sortBySoonestExpiry(all)));
    expect(names(all)).toEqual(['Expired', 'Soon', 'Sealed', 'Opened', 'Nodate']);
    expect(all.map((p) => p.status)).toEqual(['expired', 'expiring', 'unopened', 'ok', 'nodate']);
    expect(all[0]?.daysLeft).toBe(-6);
    expect(all[3]?.effectiveExpiry).toBe('2027-09-01');

    expect(
      names(listProducts(db, filters({ statuses: ['expired', 'expiring'] }), TODAY, WARN)),
    ).toEqual(['Expired', 'Soon']);
    expect(names(listProducts(db, filters({ categories: ['serum'] }), TODAY, WARN))).toEqual([
      'Soon',
      'Opened',
    ]);
  });

  it('sorts by name and by newest first, and leaves archived products out', () => {
    const db = createTestDb();
    const a = createProduct(db, input({ name: 'beta' }));
    createProduct(db, input({ name: 'Alpha' }));
    createProduct(db, input({ name: 'Čiobrelis' }));
    createProduct(db, input({ name: 'Cinamonas' }));
    expect(names(listProducts(db, filters({ sort: 'name' }), TODAY, WARN, 'lt'))).toEqual([
      'Alpha',
      'beta',
      'Cinamonas',
      'Čiobrelis',
    ]);
    expect(names(listProducts(db, filters({ sort: 'recent' }), TODAY, WARN))).toEqual([
      'Cinamonas',
      'Čiobrelis',
      'Alpha',
      'beta',
    ]);
    markFinished(db, a, TODAY);
    expect(names(listProducts(db, filters(), TODAY, WARN))).not.toContain('beta');
  });

  it('marks products that hit the avoid list, by ingredient or by group', () => {
    const db = createTestDb();
    const plain = createProduct(db, input({ name: 'Plain', ingredients: ['Water'] }));
    const scented = createProduct(db, input({ name: 'Scented', ingredients: ['Parfum'] }));
    const acid = createProduct(db, input({ name: 'Acid', ingredients: ['Glycolic Acid'] }));
    const group = db.insert(ingredientGroup).values({ name: 'AHA' }).returning().get();
    db.update(ingredient)
      .set({ groupId: group.id })
      .where(eq(ingredient.normalizedName, 'glycolic acid'))
      .run();
    const parfum = db
      .select()
      .from(ingredient)
      .where(eq(ingredient.normalizedName, 'parfum'))
      .get();
    db.insert(avoidItem)
      .values([
        { kind: 'ingredient', refId: parfum!.id },
        { kind: 'group', refId: group.id },
      ])
      .run();

    const rows = listProducts(db, filters({ sort: 'name' }), TODAY, WARN);
    expect(rows.map((r) => [r.name, r.avoid])).toEqual([
      ['Acid', true],
      ['Plain', false],
      ['Scented', true],
    ]);
    expect(
      names(listProducts(db, filters({ avoidOnly: true, sort: 'name' }), TODAY, WARN)),
    ).toEqual(['Acid', 'Scented']);
    expect(getProduct(db, scented, TODAY, WARN)?.avoid).toBe(true);
    expect(getProduct(db, plain, TODAY, WARN)?.avoid).toBe(false);
    expect(getProduct(db, acid, TODAY, WARN)?.avoid).toBe(true);
  });
});

describe('ingredients', () => {
  it('makes one ingredient for names that differ only in case and spaces', () => {
    const db = createTestDb();
    createProduct(db, input({ name: 'A', ingredients: ['Niacinamide'] }));
    createProduct(db, input({ name: 'B', ingredients: [' niacinamide'] }));
    const known = listKnownIngredients(db);
    expect(known).toHaveLength(1);
    expect(known[0]).toMatchObject({ name: 'Niacinamide', normalizedName: 'niacinamide' });
  });

  it('keeps the order and skips duplicates within one list', () => {
    const db = createTestDb();
    const id = createProduct(db, input());
    const ids = saveIngredients(db, id, ['Water', 'Glycerin', 'WATER', 'Panthenol']);
    expect(ids).toHaveLength(3);
    expect(getProduct(db, id, TODAY, WARN)?.ingredients.map((i) => i.name)).toEqual([
      'Water',
      'Glycerin',
      'Panthenol',
    ]);
  });

  it('removes dropped links on update but keeps the ingredient row', () => {
    const db = createTestDb();
    const id = createProduct(db, input({ ingredients: ['Water', 'Parfum'] }));
    updateProduct(db, id, input({ name: 'Cream 2', ingredients: ['Water', 'Aloe'] }));
    const detail = getProduct(db, id, TODAY, WARN);
    expect(detail?.name).toBe('Cream 2');
    expect(detail?.ingredients.map((i) => i.name)).toEqual(['Water', 'Aloe']);
    expect(listKnownIngredients(db).map((i) => i.name)).toEqual(['Aloe', 'Parfum', 'Water']);
    expect(db.select().from(productIngredient).all()).toHaveLength(2);
  });
});

describe('product detail', () => {
  it('returns null for a missing product', () => {
    expect(getProduct(createTestDb(), 99, TODAY, WARN)).toBeNull();
  });

  it('gives cost per day only once finished, and asks registered sources for "used in"', () => {
    const db = createTestDb();
    const id = createProduct(db, input({ price: 2000, openedAt: '2026-09-07' }));
    expect(getProduct(db, id, TODAY, WARN)?.costPerDay).toBeNull();
    expect(getProduct(db, id, TODAY, WARN)?.usedIn).toEqual([]);
    markFinished(db, id, TODAY);
    expect(getProduct(db, id, TODAY, WARN)?.costPerDay).toEqual({ cents: 67, days: 30 });

    addUsedInSource((_db, productId) =>
      productId === id ? [{ kind: 'routine', id: 1, name: 'Morning' }] : [],
    );
    expect(getProduct(db, id, TODAY, WARN)?.usedIn).toEqual([
      { kind: 'routine', id: 1, name: 'Morning' },
    ]);
  });
});

describe('writes', () => {
  it('marks a product opened today', () => {
    const db = createTestDb();
    const id = createProduct(db, input());
    markOpened(db, id, TODAY);
    expect(getProduct(db, id, TODAY, WARN)?.openedAt).toBe(TODAY);
  });

  it('finishes and restores, returning the previous value for Undo', () => {
    const db = createTestDb();
    const id = createProduct(db, input());
    expect(markFinished(db, id, TODAY)).toBeNull();
    expect(countArchived(db)).toBe(1);
    expect(markFinished(db, id, '2026-10-08')).toBe(TODAY);
    restoreProduct(db, id);
    expect(countArchived(db)).toBe(0);
  });

  it('finishes several products at once and undoes them', () => {
    const db = createTestDb();
    const a = createProduct(db, input({ name: 'A' }));
    const b = createProduct(db, input({ name: 'B' }));
    const c = createProduct(db, input({ name: 'C' }));
    const previous = markFinishedMany(db, [a, b], TODAY);
    expect(previous).toEqual([
      { id: a, archivedAt: null },
      { id: b, archivedAt: null },
    ]);
    expect(names(listProducts(db, filters(), TODAY, WARN))).toEqual(['C']);
    undoFinished(db, previous);
    expect(listProducts(db, filters(), TODAY, WARN)).toHaveLength(3);
    expect(markFinishedMany(db, [], TODAY)).toEqual([]);
    expect(c).toBeGreaterThan(0);
  });

  it('refuses to delete an active product and deletes an archived one with its photo', () => {
    const db = createTestDb();
    const deleteFile = jest.fn();
    const id = createProduct(
      db,
      input({ photoUri: 'file:///photos/a.jpg', ingredients: ['Water'] }),
    );
    expect(() => deleteProduct(db, id, deleteFile)).toThrow(ActiveProductDeleteError);
    markFinished(db, id, TODAY);
    deleteProduct(db, id, deleteFile);
    expect(getProduct(db, id, TODAY, WARN)).toBeNull();
    expect(deleteFile).toHaveBeenCalledWith('file:///photos/a.jpg');
    expect(db.select().from(productIngredient).all()).toHaveLength(0);
    expect(listKnownIngredients(db)).toHaveLength(1);
  });

  it('keeps a photo another product still uses', () => {
    const db = createTestDb();
    const deleteFile = jest.fn();
    const id = createProduct(db, input({ photoUri: 'file:///photos/a.jpg' }));
    duplicateProduct(db, id, TODAY);
    markFinished(db, id, TODAY);
    deleteProduct(db, id, deleteFile);
    expect(deleteFile).not.toHaveBeenCalled();
  });

  it('still deletes the row when the photo file cannot be removed', () => {
    const db = createTestDb();
    const id = createProduct(db, input({ photoUri: 'file:///gone.jpg' }));
    markFinished(db, id, TODAY);
    deleteProduct(db, id, () => {
      throw new Error('missing');
    });
    expect(hasAnyProduct(db)).toBe(false);
  });

  it('duplicates fields and ingredients as a new purchase today', () => {
    const db = createTestDb();
    const id = createProduct(
      db,
      input({
        name: 'Serum',
        brand: 'Brand',
        price: 1500,
        size: 30,
        unit: 'ml',
        purchasedAt: '2026-01-01',
        openedAt: '2026-02-01',
        paoMonths: 6,
        notes: 'Nice',
        ingredients: ['Water', 'Niacinamide'],
      }),
    );
    db.update(product).set({ rating: 4, wouldRebuy: true }).where(eq(product.id, id)).run();
    markFinished(db, id, TODAY);

    const copy = getProduct(db, duplicateProduct(db, id, TODAY), TODAY, WARN);
    expect(copy).toMatchObject({
      name: 'Serum',
      brand: 'Brand',
      priceCents: 1500,
      size: 30,
      unit: 'ml',
      paoMonths: 6,
      purchasedAt: TODAY,
      openedAt: null,
      archivedAt: null,
      rating: null,
      wouldRebuy: null,
      notes: null,
    });
    expect(copy?.ingredients.map((i) => i.name)).toEqual(['Water', 'Niacinamide']);
  });
});

describe('archive', () => {
  it('sorts by date, or by cost per day with products lacking a cost last', () => {
    const db = createTestDb();
    const cheap = createProduct(db, input({ name: 'Cheap', price: 300, openedAt: '2026-07-09' }));
    const free = createProduct(db, input({ name: 'No price', openedAt: '2026-09-01' }));
    const dear = createProduct(db, input({ name: 'Dear', price: 3000, openedAt: '2026-09-07' }));
    markFinished(db, cheap, '2026-10-07');
    markFinished(db, free, '2026-10-05');
    markFinished(db, dear, '2026-10-06');

    expect(names(listArchived(db, 'date'))).toEqual(['Cheap', 'Dear', 'No price']);
    const byCost = listArchived(db, 'cost');
    expect(names(byCost)).toEqual(['Dear', 'Cheap', 'No price']);
    expect(byCost[0]?.costPerDay).toEqual({ cents: 103, days: 29 });
    expect(byCost[2]?.costPerDay).toBeNull();
  });
});

describe('lookups', () => {
  it('suggests up to five distinct earlier brands by prefix', () => {
    const db = createTestDb();
    for (const brand of ['La Roche-Posay', 'la roche-posay', 'Lancôme', 'Laneige', 'CeraVe']) {
      createProduct(db, input({ brand }));
    }
    expect(brandSuggestions(db, 'lan').toSorted()).toEqual(['Lancôme', 'Laneige']);
    expect(brandSuggestions(db, 'LA')).toHaveLength(3);
    expect(brandSuggestions(db, 'CeraVe')).toEqual([]);
    for (let i = 0; i < 6; i++) createProduct(db, input({ brand: `Brand ${i}` }));
    expect(brandSuggestions(db, 'br')).toHaveLength(5);
  });

  it('lists picker products of an area by name with their status', () => {
    const db = createTestDb();
    createProduct(db, input({ name: 'Shampoo', area: 'hair', category: 'shampoo' }));
    createProduct(db, input({ name: 'Old', expiresAt: '2026-01-01' }));
    createProduct(db, input({ name: 'Oil', area: 'both' }));
    const finished = createProduct(db, input({ name: 'Finished' }));
    markFinished(db, finished, TODAY);
    const skin = productsForPicker(db, { area: 'skin' }, TODAY, WARN);
    expect(skin.map((p) => [p.name, p.status])).toEqual([
      ['Oil', 'nodate'],
      ['Old', 'expired'],
    ]);
    expect(names(productsForPicker(db, { area: 'hair', search: 'sham' }, TODAY, WARN))).toEqual([
      'Shampoo',
    ]);
  });

  it('lists expiring and expired products soonest first, up to the limit', () => {
    const db = createTestDb();
    createProduct(db, input({ name: 'Later', expiresAt: '2026-10-30' }));
    createProduct(db, input({ name: 'Gone', expiresAt: '2026-10-01' }));
    createProduct(db, input({ name: 'Soon', expiresAt: '2026-10-10' }));
    createProduct(db, input({ name: 'Fine', expiresAt: '2027-10-10' }));
    expect(names(expiringSoon(db, TODAY, WARN, 2))).toEqual(['Gone', 'Soon']);
    expect(names(expiringSoon(db, TODAY, WARN, 5))).toEqual(['Gone', 'Soon', 'Later']);
  });

  it('knows whether any product exists', () => {
    const db = createTestDb();
    expect(hasAnyProduct(db)).toBe(false);
    createProduct(db, input());
    expect(hasAnyProduct(db)).toBe(true);
  });
});

const form = (over: Partial<ProductFormValues> = {}): ProductFormValues => ({
  name: 'Cream',
  brand: '',
  area: 'skin',
  category: 'other',
  size: '',
  unit: null,
  price: '',
  purchasedAt: null,
  expiresAt: null,
  openedAt: null,
  paoMonths: '',
  notes: '',
  photoUri: null,
  ingredients: '',
  ...over,
});

describe('productSchema', () => {
  const schema = productSchema(TODAY);
  const errorsOf = (over: Partial<ProductFormValues>) => {
    const r = schema.safeParse(form(over));
    return r.success ? [] : r.error.issues.map((i) => i.message);
  };

  it('parses a minimal product into stored values', () => {
    expect(schema.parse(form({ name: '  Day   cream ' }))).toEqual({
      name: 'Day cream',
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
    });
  });

  it('requires a name of up to 80 characters', () => {
    expect(errorsOf({ name: '   ' })).toEqual(['products.errors.nameRequired']);
    expect(errorsOf({ name: 'x'.repeat(81) })).toEqual(['products.errors.nameLong']);
    expect(errorsOf({ name: 'x'.repeat(80) })).toEqual([]);
  });

  it('requires an area and defaults the category', () => {
    expect(errorsOf({ area: undefined })).toEqual(['products.errors.areaRequired']);
    const { category: _, ...rest } = form();
    expect(schema.parse(rest).category).toBe('other');
  });

  it('takes a size above 0 with a comma or a dot', () => {
    expect(schema.parse(form({ size: '50,5', unit: 'ml' })).size).toBe(50.5);
    expect(errorsOf({ size: '0' })).toEqual(['products.errors.sizePositive']);
    expect(errorsOf({ size: 'abc' })).toEqual(['products.errors.sizeNumber']);
  });

  it('stores the price in cents and refuses negatives', () => {
    expect(schema.parse(form({ price: '12,99' })).price).toBe(1299);
    expect(schema.parse(form({ price: '0' })).price).toBe(0);
    expect(schema.parse(form({ price: '7.5' })).price).toBe(750);
    expect(errorsOf({ price: '-1' })).toEqual(['products.errors.priceNegative']);
    expect(errorsOf({ price: '1.999' })).toEqual(['products.errors.priceNumber']);
  });

  it("doesn't allow an opened date after today, but any expiry date", () => {
    expect(errorsOf({ openedAt: '2026-10-08' })).toEqual(['products.errors.openedFuture']);
    expect(errorsOf({ openedAt: TODAY })).toEqual([]);
    expect(errorsOf({ expiresAt: '2020-01-01' })).toEqual([]);
    expect(errorsOf({ expiresAt: '2026-13-01' })).toEqual(['products.errors.date']);
  });

  it('takes 1–120 months after opening', () => {
    expect(schema.parse(form({ paoMonths: ' 12 ' })).paoMonths).toBe(12);
    expect(errorsOf({ paoMonths: '0' })).toEqual(['products.errors.monthsRange']);
    expect(errorsOf({ paoMonths: '121' })).toEqual(['products.errors.monthsRange']);
    expect(errorsOf({ paoMonths: '1.5' })).toEqual(['products.errors.monthsNumber']);
  });

  it('limits notes to 500 characters', () => {
    expect(errorsOf({ notes: 'x'.repeat(501) })).toEqual(['products.errors.notesLong']);
    expect(schema.parse(form({ notes: ' ok ' })).notes).toBe('ok');
  });

  it('parses the ingredient box one per line', () => {
    expect(schema.parse(form({ ingredients: 'Water\n\n glycerin \nWATER' })).ingredients).toEqual([
      'Water',
      'glycerin',
    ]);
  });
});

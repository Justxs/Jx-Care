import { eq } from 'drizzle-orm';

import { createTestDb } from '../test-db';
import {
  conditionLog,
  ingredient,
  product,
  productIngredient,
  progressEntry,
  routine,
  routineLog,
  routineStep,
  shoppingItem,
} from '../schema';

describe('database schema', () => {
  it('stores a product with ingredients and cascades on delete', () => {
    const db = createTestDb();
    const p = db
      .insert(product)
      .values({ name: 'Vitamin C serum', area: 'skin' })
      .returning()
      .get();
    expect(p.category).toBe('other');
    expect(p.createdAt).toBeGreaterThan(0);
    const a = db
      .insert(ingredient)
      .values({ name: 'Ascorbic acid', normalizedName: 'ascorbic acid' })
      .returning()
      .get();
    const b = db
      .insert(ingredient)
      .values({ name: 'Water', normalizedName: 'water' })
      .returning()
      .get();
    db.insert(productIngredient)
      .values([
        { productId: p.id, ingredientId: a.id, position: 0 },
        { productId: p.id, ingredientId: b.id, position: 1 },
      ])
      .run();

    const rows = db
      .select({ name: ingredient.name })
      .from(productIngredient)
      .innerJoin(ingredient, eq(ingredient.id, productIngredient.ingredientId))
      .where(eq(productIngredient.productId, p.id))
      .orderBy(productIngredient.position)
      .all();
    expect(rows.map((r) => r.name)).toEqual(['Ascorbic acid', 'Water']);

    db.delete(product).where(eq(product.id, p.id)).run();
    expect(db.select().from(productIngredient).all()).toEqual([]);
    expect(db.select().from(ingredient).all()).toHaveLength(2);
  });

  it('enforces unique constraints', () => {
    const db = createTestDb();
    const r = db
      .insert(routine)
      .values({ name: 'Evening', timeOfDay: 'evening' })
      .returning()
      .get();
    db.insert(routineLog).values({ routineId: r.id, day: '2026-10-06' }).run();
    expect(() =>
      db.insert(routineLog).values({ routineId: r.id, day: '2026-10-06' }).run(),
    ).toThrow(/UNIQUE constraint failed/);

    db.insert(conditionLog).values({ day: '2026-10-06', area: 'skin' }).run();
    db.insert(conditionLog).values({ day: '2026-10-06', area: 'hair' }).run();
    expect(() => db.insert(conditionLog).values({ day: '2026-10-06', area: 'skin' }).run()).toThrow(
      /UNIQUE constraint failed/,
    );

    db.insert(progressEntry).values({ area: 'skin', weekStart: '2026-10-05' }).run();
    expect(() =>
      db.insert(progressEntry).values({ area: 'skin', weekStart: '2026-10-05' }).run(),
    ).toThrow(/UNIQUE constraint failed/);

    db.insert(ingredient).values({ name: 'Niacinamide', normalizedName: 'niacinamide' }).run();
    expect(() =>
      db.insert(ingredient).values({ name: 'niacinamide', normalizedName: 'niacinamide' }).run(),
    ).toThrow(/UNIQUE constraint failed/);
  });

  it('sets step and shopping product ids to null when a product is deleted', () => {
    const db = createTestDb();
    const p = db.insert(product).values({ name: 'SPF 50 fluid', area: 'skin' }).returning().get();
    const r = db
      .insert(routine)
      .values({ name: 'Morning', timeOfDay: 'morning' })
      .returning()
      .get();
    const s = db.insert(routineStep).values({ routineId: r.id, productId: p.id }).returning().get();
    const item = db
      .insert(shoppingItem)
      .values({ productId: p.id, name: 'SPF 50 fluid' })
      .returning()
      .get();

    db.delete(product).where(eq(product.id, p.id)).run();
    expect(
      db.select().from(routineStep).where(eq(routineStep.id, s.id)).get()?.productId,
    ).toBeNull();
    expect(
      db.select().from(shoppingItem).where(eq(shoppingItem.id, item.id)).get()?.productId,
    ).toBeNull();
  });

  it('keeps json columns as arrays', () => {
    const db = createTestDb();
    const r = db
      .insert(routine)
      .values({ name: 'Evening A', timeOfDay: 'evening', daysOfWeek: [2, 5] })
      .returning()
      .get();
    expect(r.daysOfWeek).toEqual([2, 5]);
    expect(r.active).toBe(true);
  });
});

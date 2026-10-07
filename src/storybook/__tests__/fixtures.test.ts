import { createTestDb } from '@/db/test-db';
import { listAvoidItems } from '@/features/conflicts/avoidRepo';
import { conflictInput } from '@/features/conflicts/repo';
import { hairDueToday } from '@/features/hair/repo';
import { listNotes } from '@/features/products/notesRepo';
import { countArchived, getProduct, listProducts } from '@/features/products/repo';
import { defaultProductFilters } from '@/features/products/types';
import { getTodayRoutines } from '@/features/routines/repo';
import { getSettings } from '@/features/settings/repo';
import { listShopping } from '@/features/shopping/repo';
import { weeklyConflicts } from '@/lib/conflicts';

import { demoIds, FIXTURE_TODAY, seedDemo, seedEmpty } from '../fixtures';

describe('seedDemo', () => {
  const db = createTestDb();
  seedDemo(db);
  const today = FIXTURE_TODAY;
  const p = demoIds.products;

  it('has a product in every status, one finished', () => {
    const status = new Map(
      listProducts(db, defaultProductFilters, today, 30).map((x) => [x.id, x.status]),
    );
    expect(status.get(p.cleanser)).toBe('ok');
    expect(status.get(p.vitaminC)).toBe('expiring');
    expect(status.get(p.glycolicToner)).toBe('unopened');
    expect(status.get(p.sunscreen)).toBe('expired');
    expect(status.get(p.moisturiser)).toBe('nodate');
    expect(status.has(p.clayMask)).toBe(false);
    expect(countArchived(db)).toBe(1);
  });

  it('gives products ingredients, notes, a rating and an avoided ingredient', () => {
    const retinol = getProduct(db, p.retinol, today, 30);
    expect(retinol?.ingredients.map((i) => i.name)).toContain('Retinol');
    expect(retinol?.rating).toBe(4);
    expect(listNotes(db, p.retinol)).toHaveLength(2);
    expect(listAvoidItems(db).map((a) => a.name)).toEqual(['Parfum']);
    expect(getProduct(db, p.conditioner, today, 30)?.avoid).toBe(true);
  });

  it('has a morning routine half done today and an A/B evening with a conflict', () => {
    const groups = getTodayRoutines(db, today, 30);
    const morning = groups.find((g) => g.key === 'morning');
    const evening = groups.find((g) => g.key === 'evening');
    expect(morning?.routines[0]?.progress.done).toBe(2);
    expect(evening?.routines.map((r) => r.id)).toEqual([
      demoIds.routines.eveningA,
      demoIds.routines.eveningB,
    ]);
    expect(evening?.chosenId).toBe(demoIds.routines.eveningA);
    expect(weeklyConflicts(conflictInput(db)).length).toBeGreaterThan(0);
  });

  it('has a hair wash due today and a shopping list', () => {
    expect(hairDueToday(db, today).map((t) => t.id)).toContain(demoIds.hairTasks.wash);
    const lists = listShopping(db);
    expect(lists.toBuy.map((i) => i.id)).toEqual(
      expect.arrayContaining([demoIds.shoppingItems.clayMask, demoIds.shoppingItems.hairOil]),
    );
    expect(lists.wantToTry.map((i) => i.id)).toEqual([demoIds.shoppingItems.hydratingToner]);
    expect(lists.bought.map((i) => i.id)).toEqual([demoIds.shoppingItems.lipBalm]);
  });

  it('works on any day', () => {
    expect(() => seedDemo(createTestDb(), '2027-02-28')).not.toThrow();
  });
});

describe('seedEmpty', () => {
  it('creates only the settings row', () => {
    const db = createTestDb();
    seedEmpty(db);
    expect(getSettings(db).reminderAskDone).toBe(true);
    expect(listProducts(db, defaultProductFilters, FIXTURE_TODAY, 30)).toEqual([]);
  });
});

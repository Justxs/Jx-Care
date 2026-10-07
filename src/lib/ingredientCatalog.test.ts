import en from '@/i18n/en.json';
import lt from '@/i18n/lt.json';

import { catalogCategories, catalogEntry, ingredientCatalog } from './ingredientCatalog';
import { suggestIngredients } from './ingredients';
import { normalizeName, tidy } from './text';

const first = (q: string) => suggestIngredients(q, [])[0]?.name;

describe('ingredientCatalog', () => {
  it('holds a few hundred ingredients', () => {
    expect(ingredientCatalog.length).toBeGreaterThanOrEqual(300);
  });

  it('has unique names and aliases once normalised', () => {
    const seen = new Map<string, string>();
    for (const entry of ingredientCatalog) {
      for (const term of [entry.name, ...entry.aliases]) {
        const key = normalizeName(term);
        expect([term, seen.get(key)]).toEqual([term, undefined]);
        seen.set(key, entry.name);
      }
    }
  });

  it('keeps names tidy', () => {
    for (const entry of ingredientCatalog) {
      expect(tidy(entry.name)).toBe(entry.name);
      for (const alias of entry.aliases) expect(tidy(alias)).toBe(alias);
    }
  });

  it('names every category in both languages', () => {
    for (const key of catalogCategories) {
      expect(en.ingredients.category[key]).toEqual(expect.any(String));
      expect(lt.ingredients.category[key]).toEqual(expect.any(String));
    }
    expect(new Set(ingredientCatalog.map((e) => e.category))).toEqual(new Set(catalogCategories));
  });

  it('finds entries by normalised name', () => {
    expect(catalogEntry('niacinamide')).toMatchObject({
      name: 'Niacinamide',
      category: 'brightening',
    });
    expect(catalogEntry(normalizeName('  ASCORBIC  acid'))?.aliases).toContain('Vitamin C');
    expect(catalogEntry('not an ingredient')).toBeUndefined();
  });

  it('suggests INCI names for everyday words', () => {
    expect(first('vitamin c')).toBe('Ascorbic acid');
    expect(first('niacin')).toBe('Niacinamide');
    expect(first('shea')).toBe('Butyrospermum parkii butter');
    expect(first('water')).toBe('Aqua');
    expect(first('fragrance')).toBe('Parfum');
    expect(first('hialurono')).toBe('Hyaluronic acid');
  });
});

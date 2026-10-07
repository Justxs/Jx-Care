import {
  classifyIngredients,
  parseIngredientLines,
  splitPastedText,
  suggestIngredients,
  type KnownIngredient,
} from './ingredients';

describe('parseIngredientLines', () => {
  it('splits on new lines, trims, drops blanks and merges duplicates', () => {
    expect(parseIngredientLines('Aqua\r\n  Glycerin \n\nniacinamide\nNiacinamide\n  ')).toEqual([
      'Aqua',
      'Glycerin',
      'niacinamide',
    ]);
  });
  it('keeps commas inside a line', () => {
    expect(parseIngredientLines('Parfum, limonene')).toEqual(['Parfum, limonene']);
  });
});

describe('splitPastedText', () => {
  it('splits a comma list from a pack', () => {
    const r = splitPastedText('Aqua, Glycerin, Niacinamide, Zinc PCA, Parfum');
    expect(r.text).toBe('Aqua\nGlycerin\nNiacinamide\nZinc PCA\nParfum');
    expect(r.splitLines).toBe(5);
  });
  it('keeps a line with one comma', () => {
    expect(splitPastedText('Parfum, limonene')).toEqual({
      text: 'Parfum, limonene',
      splitLines: 0,
    });
  });
  it('does not split at commas inside parentheses', () => {
    const r = splitPastedText('Aqua, Parfum (fragrance, limonene), Glycerin');
    expect(r.text).toBe('Aqua\nParfum (fragrance, limonene)\nGlycerin');
    expect(r.splitLines).toBe(3);
    expect(splitPastedText('Parfum (fragrance, limonene, linalool)').splitLines).toBe(0);
  });
  it('splits some lines of mixed text and not others', () => {
    const r = splitPastedText('Aqua\nGlycerin, Niacinamide, Aqua,\nParfum, limonene\n');
    expect(r.text).toBe('Aqua\nGlycerin\nNiacinamide\nAqua\nParfum, limonene\n');
    expect(r.splitLines).toBe(3);
    expect(parseIngredientLines(r.text)).toEqual([
      'Aqua',
      'Glycerin',
      'Niacinamide',
      'Parfum, limonene',
    ]);
  });
});

const known: KnownIngredient[] = [
  { id: 1, name: 'Niacinamide', normalizedName: 'niacinamide' },
  { id: 2, name: 'Glycerin', normalizedName: 'glycerin' },
  { id: 3, name: 'Glycolic acid', normalizedName: 'glycolic acid' },
  { id: 4, name: 'Salicylic acid', normalizedName: 'salicylic acid' },
  { id: 5, name: 'Ascorbic acid', normalizedName: 'ascorbic acid' },
];

describe('classifyIngredients', () => {
  it('marks known and new ingredients', () => {
    expect(classifyIngredients(['niacinamide', 'Retinol'], known)).toEqual([
      { name: 'niacinamide', normalizedName: 'niacinamide', status: 'existing', id: 1 },
      { name: 'Retinol', normalizedName: 'retinol', status: 'new' },
    ]);
  });
});

describe('suggestIngredients', () => {
  it('returns prefix matches before substring matches', () => {
    expect(suggestIngredients('gly', known).map((k) => k.id)).toEqual([2, 3]);
    expect(suggestIngredients('acid', known).map((k) => k.id)).toEqual([5, 3, 4]);
    expect(suggestIngredients('ACID', known, 2).map((k) => k.id)).toEqual([5, 3]);
  });
  it('ignores empty input and exact matches', () => {
    expect(suggestIngredients('  ', known)).toEqual([]);
    expect(suggestIngredients('glycerin', known)).toEqual([]);
  });
});

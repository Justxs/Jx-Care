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

const names = (list: { name: string }[]) => list.map((s) => s.name);

describe('suggestIngredients', () => {
  it('returns prefix matches before substring matches', () => {
    expect(names(suggestIngredients('gly', known, 5, []))).toEqual(['Glycerin', 'Glycolic acid']);
    expect(names(suggestIngredients('acid', known, 5, []))).toEqual([
      'Ascorbic acid',
      'Glycolic acid',
      'Salicylic acid',
    ]);
    expect(names(suggestIngredients('ACID', known, 2, []))).toEqual([
      'Ascorbic acid',
      'Glycolic acid',
    ]);
  });
  it('ignores empty input and exact matches', () => {
    expect(suggestIngredients('  ', known, 5, [])).toEqual([]);
    expect(suggestIngredients('glycerin', known, 5, [])).toEqual([]);
  });

  const catalog = [
    { name: 'Glycerin', aliases: ['Glycerol'] },
    { name: 'Glyceryl stearate', aliases: [] },
    { name: 'Ascorbic acid', aliases: ['Vitamin C', 'Vitaminas C'] },
    { name: 'Tocopherol', aliases: ['Vitamin E'] },
    { name: 'Tocopheryl acetate', aliases: ['Vitamin E acetate'] },
    { name: 'Aqua', aliases: ['Water', 'Vanduo'] },
  ];

  it("adds catalogue entries after the person's own, without repeating theirs", () => {
    expect(suggestIngredients('glyc', known, 5, catalog)).toEqual([
      { key: 'glycerin', name: 'Glycerin', alias: null },
      { key: 'glycolic acid', name: 'Glycolic acid', alias: null },
      { key: 'glyceryl stearate', name: 'Glyceryl stearate', alias: null },
    ]);
  });
  it('matches aliases and names the alias that matched', () => {
    expect(suggestIngredients('vitamin e', [], 5, catalog)).toEqual([
      { key: 'tocopherol', name: 'Tocopherol', alias: 'Vitamin E' },
      { key: 'tocopheryl acetate', name: 'Tocopheryl acetate', alias: 'Vitamin E acetate' },
    ]);
    // A full alias comes first, even before names that start with the text.
    expect(names(suggestIngredients('vitamin c', known, 5, catalog))).toEqual(['Ascorbic acid']);
    expect(suggestIngredients('vanduo', [], 5, catalog)[0]).toMatchObject({
      name: 'Aqua',
      alias: 'Vanduo',
    });
    // Accents don't matter: "vitaminas c" also finds "Vitaminas C".
    expect(suggestIngredients('VITAMINAS', [], 5, catalog)[0]?.alias).toBe('Vitaminas C');
  });
  it('shows no alias when the name itself matches', () => {
    expect(suggestIngredients('toco', [], 5, catalog).map((s) => s.alias)).toEqual([null, null]);
  });
});

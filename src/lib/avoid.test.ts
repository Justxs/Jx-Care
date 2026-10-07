import { avoidMatches, parsedLinesAvoidMatches } from './avoid';

const groups = new Map<number, number | null>([
  [1, 10],
  [2, null],
]);

describe('avoidMatches', () => {
  it('matches directly by ingredient', () => {
    const items = [{ id: 1, kind: 'ingredient' as const, refId: 2 }];
    expect(avoidMatches([1, 2], groups, items)).toEqual(items);
    expect(avoidMatches([1], groups, items)).toEqual([]);
  });
  it('matches a group through one of its ingredients', () => {
    const items = [{ id: 1, kind: 'group' as const, refId: 10 }];
    expect(avoidMatches([1], groups, items)).toEqual(items);
    expect(avoidMatches([2], groups, items)).toEqual([]);
  });
});

describe('parsedLinesAvoidMatches', () => {
  it('matches typed lines by normalised name', () => {
    const known = [
      { id: 1, name: 'Parfum', normalizedName: 'parfum' },
      { id: 2, name: 'Water', normalizedName: 'water' },
    ];
    const items = [{ id: 7, kind: 'group' as const, refId: 10 }];
    expect(
      parsedLinesAvoidMatches(['  PARFUM ', 'Water', 'New thing'], known, groups, items),
    ).toEqual([{ line: '  PARFUM ', item: items[0] }]);
  });
});

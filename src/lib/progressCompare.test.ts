import {
  clampShare,
  fourWeeksBefore,
  fourWeeksPair,
  initialPair,
  pickWeek,
  sharedAngles,
  stepShare,
} from './progressCompare';

// Mondays: 7 Sep, 14 Sep, 21 Sep, 28 Sep, 5 Oct 2026.
const SEP7 = '2026-09-07';
const SEP14 = '2026-09-14';
const SEP28 = '2026-09-28';
const OCT5 = '2026-10-05';

describe('fourWeeksBefore', () => {
  it('finds the week exactly four weeks earlier', () => {
    expect(fourWeeksBefore([OCT5, SEP28, SEP7, SEP14], OCT5)).toBe(SEP7);
  });

  it('takes the closest earlier week when that one is missing, the older on a tie', () => {
    expect(fourWeeksBefore([OCT5, SEP28, SEP14], OCT5)).toBe(SEP14);
    // 31 Aug and 14 Sep are both a week from 7 Sep: the older wins.
    expect(fourWeeksBefore([OCT5, SEP14, '2026-08-31'], OCT5)).toBe('2026-08-31');
    expect(fourWeeksBefore(['2026-10-12', SEP28, OCT5], '2026-10-19')).toBe(SEP28);
  });

  it('is null with no earlier week', () => {
    expect(fourWeeksBefore([OCT5], OCT5)).toBeNull();
    expect(fourWeeksBefore([OCT5, SEP28], SEP28)).toBeNull();
  });
});

describe('fourWeeksPair', () => {
  it('pairs the newest week with four weeks before it', () => {
    expect(fourWeeksPair([SEP7, SEP14, OCT5, SEP28])).toEqual({ before: SEP7, after: OCT5 });
  });

  it('is null with one week', () => {
    expect(fourWeeksPair([OCT5])).toBeNull();
    expect(fourWeeksPair([])).toBeNull();
  });
});

describe('initialPair', () => {
  const weeks = [OCT5, SEP28, SEP14, SEP7];

  it('opens with now against four weeks ago', () => {
    expect(initialPair(weeks)).toEqual({ before: SEP7, after: OCT5 });
  });

  it('keeps a requested After and finds its Before', () => {
    expect(initialPair(weeks, { after: SEP28 })).toEqual({ before: SEP7, after: SEP28 });
    expect(initialPair(weeks, { after: SEP14 })).toEqual({ before: SEP7, after: SEP14 });
  });

  it('keeps a requested Before when it has photos and differs from After', () => {
    expect(initialPair(weeks, { before: SEP28 })).toEqual({ before: SEP28, after: OCT5 });
    expect(initialPair(weeks, { before: OCT5 })).toEqual({ before: SEP7, after: OCT5 });
    expect(initialPair(weeks, { before: '2026-08-31' })).toEqual({ before: SEP7, after: OCT5 });
  });

  it('uses the next newer week when After is the oldest', () => {
    expect(initialPair(weeks, { after: SEP7 })).toEqual({ before: SEP14, after: SEP7 });
  });

  it('ignores an After without photos', () => {
    expect(initialPair(weeks, { after: '2026-10-12' })).toEqual({ before: SEP7, after: OCT5 });
  });

  it('needs two weeks', () => {
    expect(initialPair([OCT5])).toBeNull();
    expect(initialPair([OCT5, OCT5])).toBeNull();
  });
});

describe('pickWeek', () => {
  it('sets one side', () => {
    expect(pickWeek({ before: SEP7, after: OCT5 }, 'before', SEP14)).toEqual({
      before: SEP14,
      after: OCT5,
    });
  });

  it("swaps when picking the other side's week", () => {
    expect(pickWeek({ before: SEP7, after: OCT5 }, 'before', OCT5)).toEqual({
      before: OCT5,
      after: SEP7,
    });
    expect(pickWeek({ before: SEP7, after: OCT5 }, 'after', SEP7)).toEqual({
      before: OCT5,
      after: SEP7,
    });
  });
});

describe('sharedAngles', () => {
  it('keeps the angles both weeks have, in the standard order', () => {
    expect(sharedAngles(['right', 'front', 'left'], ['left', 'front'])).toEqual(['front', 'left']);
    expect(sharedAngles(['top'], ['front'])).toEqual([]);
  });
});

describe('slider share', () => {
  it('stays inside 0–1', () => {
    expect(clampShare(-0.2)).toBe(0);
    expect(clampShare(1.4)).toBe(1);
    expect(clampShare(0.37)).toBe(0.37);
    expect(clampShare(Number.NaN)).toBe(0.5);
  });

  it('steps by tens', () => {
    expect(stepShare(0.5, 1)).toBe(0.6);
    expect(stepShare(0.37, -1)).toBe(0.3);
    expect(stepShare(1, 1)).toBe(1);
    expect(stepShare(0, -1)).toBe(0);
  });
});

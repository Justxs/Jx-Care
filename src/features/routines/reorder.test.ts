import { dragTarget, dropOffset, moveItem, rowShift } from './reorder';

describe('moveItem', () => {
  it('moves down and up', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('leaves the list alone for the same or an invalid index', () => {
    const list = ['a', 'b'];
    expect(moveItem(list, 1, 1)).toEqual(list);
    expect(moveItem(list, 0, 5)).toEqual(list);
    expect(moveItem(list, -1, 0)).toEqual(list);
  });
});

describe('dragTarget', () => {
  const heights = [60, 80, 60, 60];

  it('stays in place for small moves', () => {
    expect(dragTarget(heights, 1, 0)).toBe(1);
    expect(dragTarget(heights, 1, 20)).toBe(1);
    expect(dragTarget(heights, 1, -20)).toBe(1);
  });

  it('swaps once the centre passes the neighbour’s middle', () => {
    // Row 1 spans 60–140 (centre 100); row 2's middle is at 170.
    expect(dragTarget(heights, 1, 69)).toBe(1);
    expect(dragTarget(heights, 1, 71)).toBe(2);
    // Row 0's middle is at 30.
    expect(dragTarget(heights, 1, -71)).toBe(0);
  });

  it('clamps to the ends', () => {
    expect(dragTarget(heights, 0, 1000)).toBe(3);
    expect(dragTarget(heights, 3, -1000)).toBe(0);
  });
});

describe('dropOffset', () => {
  it('sums the rows passed over', () => {
    const heights = [60, 80, 60, 70];
    expect(dropOffset(heights, 0, 2)).toBe(140);
    expect(dropOffset(heights, 3, 1)).toBe(-140);
    expect(dropOffset(heights, 2, 2)).toBe(0);
  });
});

describe('rowShift', () => {
  it('slides the rows between the old and new place', () => {
    // Dragging row 1 (80 high) down to slot 3: rows 2 and 3 move up.
    expect([0, 1, 2, 3].map((i) => rowShift(i, 1, 3, 80))).toEqual([0, 0, -80, -80]);
    // Dragging row 3 up to slot 1: rows 1 and 2 move down.
    expect([0, 1, 2, 3].map((i) => rowShift(i, 3, 1, 60))).toEqual([0, 60, 60, 0]);
  });

  it('does nothing without a drag', () => {
    expect(rowShift(2, -1, -1, 60)).toBe(0);
  });
});

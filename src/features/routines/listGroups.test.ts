import { defaultStarterTime, groupRoutinesForList, type ListRoutine } from './listGroups';

const r = (id: number, timeOfDay: ListRoutine['timeOfDay'], sortTime: string): ListRoutine => ({
  id,
  timeOfDay,
  sortTime,
});

describe('groupRoutinesForList', () => {
  it('orders Morning, Evening, then Custom, each by sortTime', () => {
    const groups = groupRoutinesForList([
      r(1, 'custom', '13:00'),
      r(2, 'evening', '21:00'),
      r(3, 'custom', '06:00'),
      r(4, 'morning', '07:00'),
    ]);
    expect(groups.map((g) => [g.key, g.kind, g.routines.map((x) => x.id)])).toEqual([
      ['morning', 'single', [4]],
      ['evening', 'single', [2]],
      ['custom', 'custom', [3, 1]],
    ]);
  });

  it('puts two routines at one time of day together as alternatives', () => {
    const groups = groupRoutinesForList([
      r(5, 'evening', '21:00'),
      r(2, 'evening', '21:00'),
      r(1, 'morning', '07:00'),
    ]);
    expect(groups.map((g) => [g.key, g.kind, g.routines.map((x) => x.id)])).toEqual([
      ['morning', 'single', [1]],
      ['evening', 'alternatives', [2, 5]],
    ]);
  });

  it('returns nothing for no routines', () => {
    expect(groupRoutinesForList([])).toEqual([]);
  });
});

describe('defaultStarterTime', () => {
  it('opens on the time of day that has no routine yet', () => {
    expect(defaultStarterTime([{ timeOfDay: 'morning' }], 8)).toBe('evening');
    expect(defaultStarterTime([{ timeOfDay: 'evening' }], 20)).toBe('morning');
  });

  it('otherwise follows the clock', () => {
    expect(defaultStarterTime([], 9)).toBe('morning');
    expect(defaultStarterTime([], 14)).toBe('evening');
    expect(defaultStarterTime([{ timeOfDay: 'morning' }, { timeOfDay: 'evening' }], 22)).toBe(
      'evening',
    );
  });
});

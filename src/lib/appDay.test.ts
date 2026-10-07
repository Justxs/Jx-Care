import {
  addDays,
  addMonths,
  appDay,
  daysBetween,
  daysInMonthGrid,
  diffDays,
  firstOfMonth,
  isValidDay,
  localDate,
  minDay,
  momentOf,
  nextDayBoundary,
  weekdayOf,
  weekStart,
} from './appDay';

const local = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m - 1, d, h, min).getTime();

describe('appDay', () => {
  it('runs in Vilnius time for these tests', () => {
    expect(new Date(Date.UTC(2026, 6, 1, 12)).getHours()).toBe(15);
  });

  it('puts 00:00–03:59 on the previous day', () => {
    expect(appDay(local(2026, 10, 7, 0, 30))).toBe('2026-10-06');
    expect(appDay(local(2026, 10, 7, 3, 59))).toBe('2026-10-06');
    expect(appDay(local(2026, 10, 7, 4, 0))).toBe('2026-10-07');
    expect(appDay(new Date(2026, 9, 7, 23, 59))).toBe('2026-10-07');
  });

  it('handles month and year boundaries', () => {
    expect(appDay(local(2027, 1, 1, 1))).toBe('2026-12-31');
    expect(appDay(local(2026, 3, 1, 2))).toBe('2026-02-28');
  });

  it('handles DST change days in Vilnius', () => {
    // Clocks go forward on 2026-03-29 at 03:00 and back on 2026-10-25 at 04:00.
    expect(appDay(local(2026, 3, 29, 2, 30))).toBe('2026-03-28');
    expect(appDay(local(2026, 3, 29, 4, 30))).toBe('2026-03-29');
    expect(appDay(local(2026, 10, 25, 3, 30))).toBe('2026-10-24');
    expect(appDay(local(2026, 10, 25, 5, 0))).toBe('2026-10-25');
  });

  it('knows the local date', () => {
    expect(localDate(local(2026, 10, 7, 0, 30))).toBe('2026-10-07');
  });
});

describe('nextDayBoundary', () => {
  it('returns the next 04:00', () => {
    expect(nextDayBoundary(local(2026, 10, 7, 0, 30))).toBe(local(2026, 10, 7, 4));
    expect(nextDayBoundary(local(2026, 10, 7, 4, 0))).toBe(local(2026, 10, 8, 4));
    expect(nextDayBoundary(local(2026, 10, 7, 21))).toBe(local(2026, 10, 8, 4));
  });
  it('works across DST changes', () => {
    expect(nextDayBoundary(local(2026, 3, 28, 22))).toBe(local(2026, 3, 29, 4));
    expect(nextDayBoundary(local(2026, 10, 24, 22))).toBe(local(2026, 10, 25, 4));
    expect(appDay(nextDayBoundary(local(2026, 10, 24, 22)))).toBe('2026-10-25');
  });
});

describe('momentOf', () => {
  it('maps a time on an app day to a moment', () => {
    expect(momentOf('2026-10-06', '21:30')).toBe(local(2026, 10, 6, 21, 30));
    expect(momentOf('2026-10-06', '00:30')).toBe(local(2026, 10, 7, 0, 30));
    expect(appDay(momentOf('2026-10-06', '00:30'))).toBe('2026-10-06');
  });
});

describe('day maths', () => {
  it('adds and diffs days across DST and leap years', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(diffDays('2026-03-30', '2026-03-28')).toBe(2);
    expect(diffDays('2026-10-26', '2026-10-24')).toBe(2);
    expect(diffDays('2026-10-01', '2026-10-06')).toBe(-5);
    expect(diffDays('2029-01-01', '2028-01-01')).toBe(366);
  });

  it('knows ISO weekdays and week starts', () => {
    expect(weekdayOf('2026-10-05')).toBe(1);
    expect(weekdayOf('2026-10-06')).toBe(2);
    expect(weekdayOf('2026-10-11')).toBe(7);
    expect(weekStart('2026-10-11')).toBe('2026-10-05');
    expect(weekStart('2026-10-05')).toBe('2026-10-05');
    expect(weekStart('2027-01-01')).toBe('2026-12-28');
  });

  it('adds months clamping to the month end', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-10-06', 12)).toBe('2027-10-06');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonths('2026-08-31', 6)).toBe('2027-02-28');
  });

  it('picks the earlier day', () => {
    expect(minDay('2026-09-30', '2026-10-01')).toBe('2026-09-30');
    expect(minDay('2026-10-01', '2026-09-30')).toBe('2026-09-30');
  });

  it('lists days and month starts', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
    expect(firstOfMonth(2026, 3)).toBe('2026-03-01');
  });

  it('validates days', () => {
    expect(isValidDay('2026-02-29')).toBe(false);
    expect(isValidDay('2028-02-29')).toBe(true);
    expect(isValidDay('2026-1-1')).toBe(false);
  });
});

describe('daysInMonthGrid', () => {
  it('always returns 42 days starting on a Monday', () => {
    for (const [y, m] of [
      [2026, 2],
      [2026, 10],
      [2027, 2],
      [2026, 6],
    ] as const) {
      const grid = daysInMonthGrid(y, m);
      expect(grid).toHaveLength(42);
      expect(weekdayOf(grid[0]!)).toBe(1);
      expect(grid).toContain(firstOfMonth(y, m));
    }
    // October 2026 starts on a Thursday.
    expect(daysInMonthGrid(2026, 10)[0]).toBe('2026-09-28');
    // June 2026 starts on a Monday.
    expect(daysInMonthGrid(2026, 6)[0]).toBe('2026-06-01');
  });
});

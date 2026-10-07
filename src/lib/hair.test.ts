import {
  hairMonthMarks,
  hairStreak,
  hairTaskState,
  logTiming,
  nextDue,
  quickSetupToTask,
  type HairLogLite,
  type HairTaskLite,
} from './hair';

const wash = (o: Partial<HairTaskLite> = {}): HairTaskLite => ({
  id: 1,
  kind: 'wash',
  otherKind: null,
  scheduleKind: 'interval',
  everyNDays: 3,
  daysOfWeek: null,
  lastDoneAt: '2026-10-03',
  active: true,
  createdDay: '2026-09-01',
  ...o,
});
const trim = (o: Partial<HairTaskLite> = {}): HairTaskLite => ({
  ...wash({ id: 2, kind: 'other', otherKind: 'trim', everyNDays: 56 }),
  ...o,
});
const log = (hairTaskId: number, day: string, dueDay: string | null): HairLogLite => ({
  hairTaskId,
  day,
  dueDay,
});

describe('nextDue', () => {
  it('adds the interval to the last done day', () => {
    expect(nextDue(wash())).toBe('2026-10-06');
  });
  it('finds the next set day after the last done day', () => {
    const t = wash({ scheduleKind: 'days', daysOfWeek: [1, 4], lastDoneAt: '2026-10-05' });
    expect(nextDue(t)).toBe('2026-10-08');
    expect(nextDue({ ...t, lastDoneAt: '2026-10-08' })).toBe('2026-10-12');
    expect(nextDue({ ...t, daysOfWeek: [] })).toBe('2026-10-12');
  });
  it('is the creation day for a task never done', () => {
    expect(nextDue(wash({ lastDoneAt: null }))).toBe('2026-09-01');
  });
});

describe('hairTaskState', () => {
  it('is upcoming, due or overdue', () => {
    expect(hairTaskState(wash(), '2026-10-05')).toEqual({
      dueDay: '2026-10-06',
      state: 'upcoming',
      overdueDays: 0,
    });
    expect(hairTaskState(wash(), '2026-10-06').state).toBe('due');
    expect(hairTaskState(wash(), '2026-10-07')).toEqual({
      dueDay: '2026-10-06',
      state: 'overdue',
      overdueDays: 1,
    });
  });
  it('washing a day early is on time and moves the next due date', () => {
    expect(logTiming('2026-10-05', '2026-10-06')).toBe('on_time');
    expect(nextDue(wash({ lastDoneAt: '2026-10-05' }))).toBe('2026-10-08');
    expect(logTiming('2026-10-07', '2026-10-06')).toBe('late');
    expect(logTiming('2026-10-07', null)).toBe('on_time');
  });
});

describe('hairStreak', () => {
  it('counts on-time washes and ignores other care', () => {
    const logs = [
      log(1, '2026-09-27', '2026-09-27'),
      log(1, '2026-09-30', '2026-09-30'),
      log(2, '2026-10-01', '2026-10-20'),
      log(1, '2026-10-03', '2026-10-03'),
    ];
    expect(hairStreak([wash(), trim()], logs, '2026-10-05')).toEqual({ current: 3, best: 3 });
  });
  it('a late wash ends the run', () => {
    const logs = [
      log(1, '2026-09-20', '2026-09-20'),
      log(1, '2026-09-23', '2026-09-23'),
      log(1, '2026-09-27', '2026-09-26'),
      log(1, '2026-09-30', '2026-09-30'),
      log(1, '2026-10-03', '2026-10-03'),
    ];
    expect(hairStreak([wash()], logs, '2026-10-05')).toEqual({ current: 2, best: 2 });
  });
  it('a currently overdue wash makes current 0; due today does not', () => {
    const logs = [log(1, '2026-10-03', '2026-10-03')];
    expect(hairStreak([wash()], logs, '2026-10-06').current).toBe(1);
    expect(hairStreak([wash()], logs, '2026-10-07')).toEqual({ current: 0, best: 1 });
  });
  it('an overdue trim never breaks the hair streak', () => {
    const logs = [log(1, '2026-10-03', '2026-10-03')];
    const oldTrim = trim({ lastDoneAt: '2026-01-01' });
    expect(hairStreak([wash(), oldTrim], logs, '2026-10-05').current).toBe(1);
  });
});

describe('hairMonthMarks', () => {
  const days = Array.from({ length: 14 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
  it('marks done, late, other care and projected due days', () => {
    const logs = [
      log(1, '2026-10-01', '2026-09-30'),
      log(1, '2026-10-03', '2026-10-04'),
      log(2, '2026-10-02', null),
    ];
    const marks = hairMonthMarks([wash(), trim()], logs, days, '2026-10-05');
    expect(marks.get('2026-10-01')).toMatchObject({ washLate: true, washDone: false });
    expect(marks.get('2026-10-03')).toMatchObject({ washDone: true });
    expect(marks.get('2026-10-02')!.otherCare).toEqual(['trim']);
    expect(marks.get('2026-10-06')!.washDue).toBe(true);
    expect(marks.get('2026-10-09')!.washDue).toBe(true);
    expect(marks.get('2026-10-12')!.washDue).toBe(true);
    expect(marks.get('2026-10-07')!.washDue).toBe(false);
  });
  it('marks an overdue due day and projects from today', () => {
    const marks = hairMonthMarks([wash()], [], days, '2026-10-08');
    expect(marks.get('2026-10-06')!.overdue).toBe(true);
    expect(marks.get('2026-10-08')!.washDue).toBe(true);
    expect(marks.get('2026-10-11')!.washDue).toBe(true);
  });
  it('handles an empty range', () => {
    expect(hairMonthMarks([wash()], [], [], '2026-10-08').size).toBe(0);
  });
});

describe('quickSetupToTask', () => {
  it('maps the frequency chips', () => {
    expect(quickSetupToTask('every_day').everyNDays).toBe(1);
    expect(quickSetupToTask('every_2_days').everyNDays).toBe(2);
    expect(quickSetupToTask('every_3_days').everyNDays).toBe(3);
    expect(quickSetupToTask('twice_a_week')).toEqual({
      scheduleKind: 'days',
      everyNDays: null,
      daysOfWeek: [1, 4],
      intervalUnit: 'days',
    });
    expect(quickSetupToTask('once_a_week').everyNDays).toBe(7);
  });
});

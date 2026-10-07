import { addDays } from './appDay';
import type { RoutineLite, RoutineLogLite, StepLite } from './schedule';
import {
  groupComplete,
  skinDayStatus,
  skinDayStatuses,
  skinDaySucceeded,
  skinStreak,
  type SkinStreakInput,
} from './streak';

const routine = (o: Partial<RoutineLite> & { id: number }): RoutineLite => ({
  name: `R${o.id}`,
  timeOfDay: 'evening',
  customName: null,
  sortTime: '21:00',
  daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  active: true,
  createdDay: '2026-09-01',
  ...o,
});
const step = (id: number, routineId: number, o: Partial<StepLite> = {}): StepLite => ({
  id,
  routineId,
  productId: id,
  position: id,
  scheduleKind: 'always',
  daysOfWeek: null,
  everyNDays: null,
  startDate: null,
  ...o,
});
const done = (routineId: number, day: string, ids: number[]): RoutineLogLite => ({
  routineId,
  day,
  dueStepIds: [],
  doneStepIds: ids,
});

const today = '2026-10-08'; // Thursday

describe('day status', () => {
  const eveA = routine({ id: 1 });
  const eveB = routine({ id: 2 });
  const morning = routine({ id: 3, timeOfDay: 'morning', sortTime: '07:00' });
  const steps = [step(1, 1), step(2, 1), step(3, 2), step(4, 3)];

  it('finishing B completes the Evening group even though A is untouched', () => {
    const input: SkinStreakInput = {
      routines: [eveA, eveB],
      steps,
      logs: [done(2, '2026-10-07', [3])],
      today,
    };
    expect(skinDayStatus('2026-10-07', input)).toBe('done');
    expect(groupComplete([{ complete: false }, { complete: true }])).toBe(true);
  });

  it('distinguishes done, partly, missed, pending and none', () => {
    const input: SkinStreakInput = {
      routines: [eveA, morning],
      steps,
      logs: [
        done(1, '2026-10-05', [1, 2]),
        done(3, '2026-10-05', [4]),
        done(1, '2026-10-06', [1]),
        done(1, '2026-10-07', [1, 2]),
      ],
      today,
    };
    expect(skinDayStatus('2026-10-05', input)).toBe('done');
    expect(skinDayStatus('2026-10-06', input)).toBe('partly');
    expect(skinDayStatus('2026-10-07', input)).toBe('partly'); // morning not done
    expect(skinDaySucceeded('2026-10-07', input)).toBe(true);
    expect(skinDayStatus('2026-10-04', input)).toBe('missed');
    expect(skinDayStatus(today, input)).toBe('pending');
    expect(skinDayStatus('2026-08-01', input)).toBe('none');
  });

  it('never marks days before a routine existed as missed', () => {
    const input: SkinStreakInput = {
      routines: [routine({ id: 1, createdDay: '2026-10-07' })],
      steps: [step(1, 1)],
      logs: [],
      today,
    };
    expect(skinDayStatus('2026-10-01', input)).toBe('none');
    expect(skinDayStatus('2026-10-07', input)).toBe('missed');
  });

  it('gives statuses for many days', () => {
    const input: SkinStreakInput = { routines: [eveA], steps, logs: [], today };
    const map = skinDayStatuses(['2026-10-06', today], input);
    expect(map.get('2026-10-06')).toBe('missed');
    expect(map.get(today)).toBe('pending');
  });
});

describe('skinStreak', () => {
  const r = routine({ id: 1, daysOfWeek: [1, 2, 3, 5, 6, 7] }); // nothing on Thursdays
  const steps = [step(1, 1)];

  it('skips a day with nothing due between two done days', () => {
    // Wed 2026-10-07 done, Thu 10-08 nothing due, Fri 10-09 done, today Sat 10-10 not done yet
    const input: SkinStreakInput = {
      routines: [r],
      steps,
      logs: [done(1, '2026-10-06', [1]), done(1, '2026-10-07', [1]), done(1, '2026-10-09', [1])],
      today: '2026-10-10',
    };
    expect(skinStreak(input).current).toBe(3);
  });

  it('a missed day breaks it; an unfinished today does not', () => {
    const input: SkinStreakInput = {
      routines: [r],
      steps,
      logs: [done(1, '2026-10-05', [1]), done(1, '2026-10-07', [1])],
      today: '2026-10-09',
    };
    // 10-06 missed, 10-07 done, 10-08 nothing due, 10-09 today unfinished
    expect(skinStreak(input).current).toBe(1);
    const finished = { ...input, logs: [...input.logs, done(1, '2026-10-09', [1])] };
    expect(skinStreak(finished).current).toBe(2);
  });

  it('keeps the best run over a history with two runs', () => {
    const r2 = routine({ id: 1, createdDay: '2026-09-01' });
    const logs: RoutineLogLite[] = [];
    for (let i = 0; i < 5; i++) logs.push(done(1, addDays('2026-09-01', i), [1])); // 5-day run
    for (let i = 0; i < 2; i++) logs.push(done(1, addDays('2026-09-10', i), [1])); // 2-day run
    const s = skinStreak({ routines: [r2], steps, logs, today: '2026-09-12' });
    expect(s).toEqual({ current: 2, best: 5 });
  });

  it('is zero without routines', () => {
    expect(skinStreak({ routines: [], steps: [], logs: [], today })).toEqual({
      current: 0,
      best: 0,
    });
  });

  it('runs 3 routines over 3 years in under 200 ms', () => {
    const routines = [
      routine({ id: 1, createdDay: '2023-10-01', timeOfDay: 'morning', sortTime: '07:00' }),
      routine({ id: 2, createdDay: '2023-10-01' }),
      routine({
        id: 3,
        createdDay: '2023-10-01',
        daysOfWeek: [2, 4],
        timeOfDay: 'custom',
        customName: 'Mask',
      }),
    ];
    const allSteps = [
      step(1, 1),
      step(2, 1),
      step(3, 2),
      step(4, 2, { scheduleKind: 'interval', everyNDays: 3, startDate: '2023-10-01' }),
      step(5, 3),
    ];
    const logs: RoutineLogLite[] = [];
    for (let d = '2023-10-01'; d < '2026-10-01'; d = addDays(d, 1)) {
      logs.push(done(1, d, [1, 2]));
      logs.push(done(2, d, [3, 4]));
    }
    // Best of three, so a busy machine (parallel test runs) doesn't fail the budget.
    let best = Infinity;
    let s = skinStreak({ routines, steps: allSteps, logs, today: '2026-10-01' });
    for (let run = 0; run < 3; run++) {
      const t0 = Date.now();
      s = skinStreak({ routines, steps: allSteps, logs, today: '2026-10-01' });
      best = Math.min(best, Date.now() - t0);
    }
    expect(best).toBeLessThan(200);
    expect(s.current).toBeGreaterThan(1000);
  });
});

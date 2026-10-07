import {
  attentionProducts,
  heldStepId,
  pickNextUp,
  playerSegments,
  remainingIds,
  remainingSeconds,
  stepCounter,
  stepProblem,
  streakRestarted,
  type NextGroup,
} from './playerLogic';
import type { RoutineStepItem, StepProduct } from './repo';

const product = (id: number, problem: StepProduct['problem'] = null): StepProduct => ({
  id,
  name: `P${id}`,
  brand: null,
  photoUri: null,
  area: 'skin',
  category: 'other',
  archivedAt: problem === 'finished' ? '2026-10-01' : null,
  status: problem === 'expired' ? 'expired' : 'ok',
  effectiveExpiry: problem === 'expired' ? '2026-10-02' : null,
  daysLeft: null,
  problem,
});

const step = (id: number, p: StepProduct | null = product(id)): RoutineStepItem => ({
  id,
  routineId: 1,
  productId: p?.id ?? null,
  position: id,
  note: null,
  scheduleKind: 'always',
  daysOfWeek: null,
  everyNDays: null,
  startDate: null,
  waitSeconds: 0,
  product: p,
});

describe('remainingSeconds', () => {
  it('rounds up and never goes below zero', () => {
    expect(remainingSeconds(60_000, 0)).toBe(60);
    expect(remainingSeconds(60_000, 100)).toBe(60);
    expect(remainingSeconds(60_000, 59_001)).toBe(1);
    expect(remainingSeconds(60_000, 60_000)).toBe(0);
    expect(remainingSeconds(60_000, 99_000)).toBe(0);
  });
});

describe('stepCounter', () => {
  it('reads the first open step, and the last once all are ticked', () => {
    expect(stepCounter({ due: 5, done: 0 })).toEqual({ index: 1, count: 5 });
    expect(stepCounter({ due: 5, done: 1 })).toEqual({ index: 2, count: 5 });
    expect(stepCounter({ due: 5, done: 5 })).toEqual({ index: 5, count: 5 });
  });
});

describe('heldStepId', () => {
  const steps = [step(1), step(2), step(3), step(4)];

  it('holds back the next open step after the one that started the wait', () => {
    expect(heldStepId(steps, [1], 1)).toBe(2);
    expect(heldStepId(steps, [1, 2], 1)).toBe(3);
  });

  it('wraps to the first open step when nothing after it is open', () => {
    expect(heldStepId(steps, [3, 4], 4)).toBe(1);
  });

  it('is null when every other step is ticked', () => {
    expect(heldStepId(steps, [1, 2, 3, 4], 2)).toBeNull();
  });
});

describe('stepProblem and playerSegments', () => {
  it('names the problem of a step', () => {
    expect(stepProblem(step(1))).toBeNull();
    expect(stepProblem(step(1, null))).toBe('empty');
    expect(stepProblem(step(1, product(1, 'expired')))).toBe('expired');
    expect(stepProblem(step(1, product(1, 'finished')))).toBe('finished');
  });

  it('groups runs of plain rows and gives every problem step its own card', () => {
    const segments = playerSegments([
      step(1),
      step(2),
      step(3, product(3, 'expired')),
      step(4),
      step(5, null),
    ]);
    expect(
      segments.map((s) =>
        s.kind === 'rows' ? s.steps.map((x) => x.id) : `${s.problem}:${s.step.id}`,
      ),
    ).toEqual([[1, 2], 'expired:3', [4], 'empty:5']);
  });
});

describe('remainingIds', () => {
  it('lists due steps not ticked yet', () => {
    const progress = { due: 3, done: 1, complete: false, dueStepIds: [1, 2, 3] };
    expect(remainingIds({ progress, log: null })).toEqual([1, 2, 3]);
    expect(
      remainingIds({
        progress,
        log: {
          id: 1,
          routineId: 1,
          day: '2026-10-05',
          dueStepIds: [1, 2, 3],
          doneStepIds: [2],
          completedAt: null,
          createdAt: 0,
          updatedAt: 0,
        },
      }),
    ).toEqual([1, 3]);
  });
});

describe('streakRestarted', () => {
  it('is true only when the best run is longer than the current one', () => {
    expect(streakRestarted({ current: 3, best: 21 })).toBe(true);
    expect(streakRestarted({ current: 21, best: 21 })).toBe(false);
    expect(streakRestarted({ current: 0, best: 0 })).toBe(false);
  });
});

describe('attentionProducts', () => {
  it('names each expired or finished product once', () => {
    const expired = product(7, 'expired');
    const finished = product(8, 'finished');
    const out = attentionProducts({
      dueSteps: [step(1), step(2, expired), step(3, expired), step(4, finished), step(5, null)],
    });
    expect(out.map((p) => p.id)).toEqual([7, 8]);
  });
});

const group = (key: string, routineIds: number[], time: string, complete = false): NextGroup => ({
  key,
  timeOfDay: key === 'morning' ? 'morning' : 'evening',
  customName: null,
  routineIds,
  complete,
  time,
});
const MON = '2026-10-05';
const TUE = '2026-10-06';

describe('pickNextUp', () => {
  it('picks a later time of day still open today', () => {
    const days = [
      {
        day: MON,
        groups: [group('morning', [1], '07:30', true), group('evening', [2, 3], '21:00')],
      },
      { day: TUE, groups: [group('morning', [1], '07:30')] },
    ];
    expect(pickNextUp(days, 1)).toEqual({
      day: MON,
      timeOfDay: 'evening',
      customName: null,
      time: '21:00',
    });
  });

  it('skips earlier and finished times of day and moves to the next day', () => {
    const days = [
      {
        day: MON,
        groups: [group('morning', [1], '07:30'), group('evening', [2, 3], '21:00', true)],
      },
      { day: TUE, groups: [group('morning', [1], '07:30')] },
    ];
    expect(pickNextUp(days, 3)).toEqual({
      day: TUE,
      timeOfDay: 'morning',
      customName: null,
      time: '07:30',
    });
  });

  it('is null when nothing is due again', () => {
    expect(pickNextUp([{ day: MON, groups: [group('evening', [2], '21:00', true)] }], 2)).toBe(
      null,
    );
  });
});

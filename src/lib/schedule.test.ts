import {
  dueSteps,
  routineProgress,
  routineRunsOn,
  stepDueOn,
  timeOfDayKey,
  todayGroups,
  type RoutineLite,
  type StepLite,
} from './schedule';

const routineFx = (o: Partial<RoutineLite> & { id: number }): RoutineLite => ({
  name: `R${o.id}`,
  timeOfDay: 'evening',
  customName: null,
  sortTime: '21:00',
  daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  active: true,
  createdDay: '2026-01-01',
  ...o,
});

const stepFx = (o: Partial<StepLite> & { id: number; routineId: number }): StepLite => ({
  productId: o.id * 10,
  position: o.id,
  scheduleKind: 'always',
  daysOfWeek: null,
  everyNDays: null,
  startDate: null,
  ...o,
});

// 2026-10-05 is a Monday.
const MON = '2026-10-05';
const TUE = '2026-10-06';
const WED = '2026-10-07';
const THU = '2026-10-08';
const FRI = '2026-10-09';

describe('routineRunsOn', () => {
  it('needs active, created, and the weekday', () => {
    const r = routineFx({ id: 1, daysOfWeek: [1, 3], createdDay: '2026-10-01' });
    expect(routineRunsOn(r, MON)).toBe(true);
    expect(routineRunsOn(r, TUE)).toBe(false);
    expect(routineRunsOn({ ...r, active: false }, MON)).toBe(false);
    expect(routineRunsOn({ ...r, createdDay: TUE }, MON)).toBe(false);
  });
});

describe('stepDueOn', () => {
  const r = routineFx({ id: 1 });
  it('a Tue/Fri step in a Mon–Sun routine is due only on Tue and Fri', () => {
    const s = stepFx({ id: 1, routineId: 1, scheduleKind: 'days', daysOfWeek: [2, 5] });
    expect([MON, TUE, WED, THU, FRI].map((d) => stepDueOn(s, r, d))).toEqual([
      false,
      true,
      false,
      false,
      true,
    ]);
  });
  it('an every-3-days step counts from its start date', () => {
    const s = stepFx({
      id: 1,
      routineId: 1,
      scheduleKind: 'interval',
      everyNDays: 3,
      startDate: TUE,
    });
    expect(stepDueOn(s, r, MON)).toBe(false);
    expect(stepDueOn(s, r, TUE)).toBe(true);
    expect(stepDueOn(s, r, WED)).toBe(false);
    expect(stepDueOn(s, r, FRI)).toBe(true);
    expect(stepDueOn({ ...s, startDate: null }, r, TUE)).toBe(false);
  });
  it('an interval step on a day the routine does not run is not due', () => {
    const r2 = routineFx({ id: 2, daysOfWeek: [1, 3, 5] });
    const s = stepFx({
      id: 1,
      routineId: 2,
      scheduleKind: 'interval',
      everyNDays: 2,
      startDate: MON,
    });
    expect(stepDueOn(s, r2, MON)).toBe(true);
    expect(stepDueOn(s, r2, WED)).toBe(true);
    expect(stepDueOn(s, r2, '2026-10-11')).toBe(false); // Sunday, routine off
  });
  it('lists due steps in order', () => {
    const steps = [
      stepFx({ id: 2, routineId: 1, position: 2 }),
      stepFx({ id: 1, routineId: 1, position: 1 }),
      stepFx({ id: 3, routineId: 1, position: 3, scheduleKind: 'days', daysOfWeek: [5] }),
      stepFx({ id: 4, routineId: 9, position: 0 }),
    ];
    expect(dueSteps(r, steps, MON).map((s) => s.id)).toEqual([1, 2]);
    expect(dueSteps(r, steps, FRI).map((s) => s.id)).toEqual([1, 2, 3]);
    expect(dueSteps({ ...r, active: false }, steps, FRI)).toEqual([]);
  });
});

describe('timeOfDayKey', () => {
  it('uses the custom name', () => {
    expect(timeOfDayKey(routineFx({ id: 1 }))).toBe('evening');
    expect(timeOfDayKey(routineFx({ id: 1, timeOfDay: 'custom', customName: 'Gym' }))).toBe(
      'custom:Gym',
    );
  });
});

describe('todayGroups', () => {
  const morning = routineFx({ id: 1, timeOfDay: 'morning', sortTime: '07:00' });
  const eveA = routineFx({ id: 2, name: 'Evening A', daysOfWeek: [1, 3, 5] });
  const eveB = routineFx({ id: 3, name: 'Evening B', daysOfWeek: [2, 4] });
  const steps = [1, 2, 3].map((id) => stepFx({ id, routineId: id }));

  it('gives one Evening group per day when A and B run on different days', () => {
    const mon = todayGroups([eveA, eveB, morning], steps, MON);
    expect(mon.map((g) => g.key)).toEqual(['morning', 'evening']);
    expect(mon[1]!.routines.map((r) => r.id)).toEqual([2]);
    const tue = todayGroups([eveA, eveB, morning], steps, TUE);
    expect(tue[1]!.routines.map((r) => r.id)).toEqual([3]);
  });

  it('gives one group with A/B options and the remembered choice', () => {
    const b = { ...eveB, daysOfWeek: [1, 2, 3, 4, 5, 6, 7] };
    const groups = todayGroups([eveA, b], steps, MON);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.routines.map((r) => r.id)).toEqual([2, 3]);
    expect(groups[0]!.chosenId).toBe(2);
    const chosen = todayGroups([eveA, b], steps, MON, [
      { timeOfDayKey: 'evening', weekday: 1, routineId: 3 },
      { timeOfDayKey: 'evening', weekday: 2, routineId: 2 },
    ]);
    expect(chosen[0]!.chosenId).toBe(3);
  });

  it('skips routines with nothing due', () => {
    const onlyFri = [stepFx({ id: 1, routineId: 1, scheduleKind: 'days', daysOfWeek: [5] })];
    expect(todayGroups([morning], onlyFri, MON)).toEqual([]);
  });
});

describe('routineProgress', () => {
  const r = routineFx({ id: 1 });
  const steps = [stepFx({ id: 1, routineId: 1 }), stepFx({ id: 2, routineId: 1 })];
  it('counts only due steps that are ticked', () => {
    expect(routineProgress(r, steps, null, MON)).toEqual({
      due: 2,
      done: 0,
      complete: false,
      dueStepIds: [1, 2],
    });
    expect(routineProgress(r, steps, { dueStepIds: [], doneStepIds: [1, 99] }, MON).done).toBe(1);
    expect(routineProgress(r, steps, { dueStepIds: [], doneStepIds: [1, 2] }, MON).complete).toBe(
      true,
    );
  });
  it('uses the snapshot of due steps when there is one', () => {
    const p = routineProgress(r, steps, { dueStepIds: [1], doneStepIds: [1] }, MON);
    expect(p).toEqual({ due: 1, done: 1, complete: true, dueStepIds: [1] });
  });
});

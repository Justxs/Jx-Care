import {
  defaultReminderTime,
  newStep,
  nextTempStepId,
  sortTimeFor,
  stepProblem,
  toSaveInput,
  withStepKeys,
} from './editor';
import { emptyRoutineForm, emptyStep, routineSchema, type StepFormValues } from './schema';

const step = (over: Partial<StepFormValues> = {}): StepFormValues => ({ ...emptyStep, ...over });

describe('step keys', () => {
  it('gives new steps distinct negative ids and keeps saved ones', () => {
    const values = {
      ...emptyRoutineForm(),
      steps: [step({ id: null }), step({ id: 7 }), step({ id: null })],
    };
    expect(withStepKeys(values).steps.map((s) => s.id)).toEqual([-1, 7, -2]);
    expect(nextTempStepId([step({ id: -1 }), step({ id: 4 })])).toBe(-2);
    expect(newStep([step({ id: -3 })]).id).toBe(-4);
  });

  it('saves temporary ids as new steps', () => {
    const parsed = routineSchema.parse({
      ...emptyRoutineForm('evening'),
      name: 'Evening A',
      steps: [step({ id: -1, productId: 3 }), step({ id: 9 })],
    });
    expect(toSaveInput(parsed, 5).steps.map((s) => s.id)).toEqual([null, 9]);
    expect(toSaveInput(parsed, 5).id).toBe(5);
  });
});

describe('times', () => {
  it('fixes morning and evening, keeps a custom time', () => {
    expect(sortTimeFor('morning', '12:00')).toBe('07:00');
    expect(sortTimeFor('evening', '12:00')).toBe('21:00');
    expect(sortTimeFor('custom', '18:30')).toBe('18:30');
    expect(defaultReminderTime({ timeOfDay: 'custom', sortTime: '18:30' })).toBe('18:30');
  });
});

describe('stepProblem', () => {
  it('is null for a fine step', () => {
    expect(stepProblem(step(), [1, 2, 3])).toBeNull();
    expect(stepProblem(step({ scheduleKind: 'days', daysOfWeek: [2] }), [1, 2, 3])).toBeNull();
  });

  it('flags days the routine no longer runs on', () => {
    expect(stepProblem(step({ scheduleKind: 'days', daysOfWeek: [2, 5] }), [1, 2, 3])).toBe(
      'routines.errors.stepDaysOutside',
    );
  });

  it('passes on schema errors', () => {
    expect(stepProblem(step({ scheduleKind: 'interval', everyNDays: '1' }), everyDayList)).toBe(
      'routines.errors.everyNDays',
    );
  });
});

const everyDayList = [1, 2, 3, 4, 5, 6, 7];

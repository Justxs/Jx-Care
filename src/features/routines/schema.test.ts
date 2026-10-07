import { emptyRoutineForm, emptyStep, routineSchema, type RoutineFormValues } from './schema';

const valid = (over: Partial<RoutineFormValues> = {}): RoutineFormValues => ({
  ...emptyRoutineForm('evening'),
  name: '  Evening A:  retinol ',
  steps: [{ ...emptyStep, productId: 1 }],
  ...over,
});

/** The i18n keys of every issue, by path. */
function errors(values: RoutineFormValues): Record<string, string> {
  const r = routineSchema.safeParse(values);
  if (r.success) return {};
  return Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]));
}

/** A routine on Mon, Tue and Fri with one step. */
const withStep = (s: Partial<RoutineFormValues['steps'][number]>) =>
  valid({ daysOfWeek: [1, 2, 5], steps: [{ ...emptyStep, ...s }] });

describe('routineSchema', () => {
  it('tidies a valid routine and fills the fixed sort time', () => {
    const out = routineSchema.parse(
      valid({ sortTime: '05:00', customName: 'ignored', daysOfWeek: [5, 1, 1] }),
    );
    expect(out).toMatchObject({
      name: 'Evening A: retinol',
      timeOfDay: 'evening',
      customName: null,
      sortTime: '21:00',
      daysOfWeek: [1, 5],
      reminderTime: null,
    });
  });

  it('needs a name under 60, a day and a step', () => {
    expect(errors(valid({ name: ' ' }))).toEqual({ name: 'routines.errors.nameRequired' });
    expect(errors(valid({ name: 'x'.repeat(61) }))).toEqual({ name: 'routines.errors.nameLong' });
    expect(errors(valid({ daysOfWeek: [] }))).toEqual({ daysOfWeek: 'routines.errors.days' });
    expect(errors(valid({ steps: [] }))).toEqual({ steps: 'routines.errors.steps' });
  });

  it('needs a time of day; custom needs a name and a default time', () => {
    expect(
      errors(valid({ timeOfDay: undefined as unknown as RoutineFormValues['timeOfDay'] })),
    ).toEqual({ timeOfDay: 'routines.errors.timeOfDayRequired' });
    expect(errors(valid({ timeOfDay: 'custom', customName: '', sortTime: '' }))).toEqual({
      customName: 'routines.errors.customNameRequired',
      sortTime: 'routines.errors.customTime',
    });
    const out = routineSchema.parse(
      valid({ timeOfDay: 'custom', customName: ' Gym ', sortTime: '18:30' }),
    );
    expect(out).toMatchObject({ customName: 'Gym', sortTime: '18:30' });
  });

  it('checks the reminder time format', () => {
    expect(errors(valid({ reminderTime: '7:30' }))).toEqual({
      reminderTime: 'routines.errors.reminderTime',
    });
    expect(routineSchema.parse(valid({ reminderTime: '07:30' })).reminderTime).toBe('07:30');
  });

  it('checks step schedules and keeps only the chosen schedule fields', () => {
    expect(errors(withStep({ scheduleKind: 'days', daysOfWeek: [] }))).toEqual({
      'steps.0.daysOfWeek': 'routines.errors.stepDays',
    });
    expect(errors(withStep({ scheduleKind: 'days', daysOfWeek: [2, 3] }))).toEqual({
      'steps.0.daysOfWeek': 'routines.errors.stepDaysOutside',
    });
    expect(
      errors(withStep({ scheduleKind: 'interval', everyNDays: '1', startDate: null })),
    ).toEqual({
      'steps.0.everyNDays': 'routines.errors.everyNDays',
      'steps.0.startDate': 'routines.errors.startDate',
    });
    expect(
      errors(withStep({ scheduleKind: 'interval', everyNDays: 61, startDate: '2026-10-05' })),
    ).toEqual({ 'steps.0.everyNDays': 'routines.errors.everyNDays' });
    expect(errors(withStep({ waitSeconds: 45 }))).toEqual({
      'steps.0.waitSeconds': 'routines.errors.waitSeconds',
    });

    const interval = routineSchema.parse(
      withStep({
        scheduleKind: 'interval',
        everyNDays: ' 3 ',
        startDate: '2026-10-05',
        daysOfWeek: [1],
        note: ' 2 drops ',
        waitSeconds: 60,
      }),
    ).steps[0];
    expect(interval).toEqual({
      id: null,
      productId: null,
      note: '2 drops',
      scheduleKind: 'interval',
      daysOfWeek: null,
      everyNDays: 3,
      startDate: '2026-10-05',
      waitSeconds: 60,
    });
    const always = routineSchema.parse(withStep({ everyNDays: 3, daysOfWeek: [1], note: ' ' }))
      .steps[0];
    expect(always).toMatchObject({ daysOfWeek: null, everyNDays: null, note: null });
  });
});

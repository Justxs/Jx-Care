import {
  emptyHairTaskForm,
  hairDoneSchema,
  hairTaskSchema,
  hairTaskToForm,
  quickHairSetupSchema,
  type HairTaskFormValues,
} from './schema';

const TODAY = '2026-10-07';
const schema = hairTaskSchema(TODAY);

const form = (over: Partial<HairTaskFormValues> = {}): HairTaskFormValues => ({
  ...emptyHairTaskForm(TODAY),
  name: 'Wash',
  ...over,
});

function errors(values: HairTaskFormValues): Record<string, string> {
  const r = schema.safeParse(values);
  if (r.success) return {};
  return Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]));
}

describe('hairTaskSchema', () => {
  it('parses a wash every 3 days', () => {
    expect(schema.parse(form({ name: '  Wash  ', productIds: [2, 1, 2] }))).toEqual({
      name: 'Wash',
      kind: 'wash',
      otherKind: null,
      productIds: [2, 1],
      scheduleKind: 'interval',
      everyNDays: 3,
      intervalUnit: 'days',
      daysOfWeek: null,
      lastDoneAt: TODAY,
      reminderTime: null,
    });
  });

  it('multiplies weeks by 7 and drops products for other care', () => {
    const out = schema.parse(
      form({ kind: 'other', interval: '8', intervalUnit: 'weeks', productIds: [1] }),
    );
    expect(out).toMatchObject({
      everyNDays: 56,
      intervalUnit: 'weeks',
      productIds: [],
      otherKind: 'other',
    });
  });

  it('stores set days sorted and without an interval', () => {
    const out = schema.parse(form({ scheduleKind: 'days', daysOfWeek: [4, 1, 4] }));
    expect(out).toMatchObject({ daysOfWeek: [1, 4], everyNDays: null, intervalUnit: 'days' });
  });

  it('checks the name, interval, days, last done and reminder time', () => {
    expect(errors(form({ name: ' ' }))).toEqual({ name: 'hair.errors.nameRequired' });
    expect(errors(form({ name: 'x'.repeat(41) }))).toEqual({ name: 'hair.errors.nameLong' });
    expect(errors(form({ interval: 'two' }))).toEqual({ interval: 'hair.errors.intervalNumber' });
    expect(errors(form({ interval: '0' }))).toEqual({ interval: 'hair.errors.intervalRange' });
    expect(errors(form({ interval: '366' }))).toEqual({ interval: 'hair.errors.intervalRange' });
    expect(errors(form({ interval: '365' }))).toEqual({});
    expect(errors(form({ interval: '53', intervalUnit: 'weeks' }))).toEqual({
      interval: 'hair.errors.intervalRange',
    });
    expect(errors(form({ scheduleKind: 'days', daysOfWeek: [] }))).toEqual({
      daysOfWeek: 'hair.errors.daysRequired',
    });
    expect(errors(form({ lastDoneAt: '2026-10-08' }))).toEqual({
      lastDoneAt: 'hair.errors.lastDoneFuture',
    });
    expect(errors(form({ lastDoneAt: '2026-02-30' }))).toEqual({ lastDoneAt: 'hair.errors.date' });
    expect(errors(form({ reminderOn: true, reminderTime: '25:00' }))).toEqual({
      reminderTime: 'hair.errors.time',
    });
    expect(schema.parse(form({ reminderOn: true, reminderTime: '08:30' })).reminderTime).toBe(
      '08:30',
    );
    expect(schema.parse(form({ reminderOn: false, reminderTime: '08:30' })).reminderTime).toBe(
      null,
    );
  });

  it('round-trips a saved task through the form', () => {
    const saved = schema.parse(form({ kind: 'other', interval: '8', intervalUnit: 'weeks' }));
    expect(hairTaskToForm(saved)).toMatchObject({ interval: '8', intervalUnit: 'weeks' });
    expect(schema.parse(hairTaskToForm(saved))).toEqual(saved);
  });
});

describe('hairDoneSchema', () => {
  const done = hairDoneSchema(TODAY);
  it('accepts today or earlier with an optional note', () => {
    expect(done.parse({ day: '2026-10-01', productIds: [1], note: '  ' })).toEqual({
      day: '2026-10-01',
      productIds: [1],
      note: null,
    });
    expect(done.safeParse({ day: '2026-10-08', productIds: [], note: '' }).success).toBe(false);
    expect(done.safeParse({ day: TODAY, productIds: [], note: 'x'.repeat(281) }).success).toBe(
      false,
    );
  });
});

describe('quickHairSetupSchema', () => {
  it('needs a known frequency and a last wash not after today', () => {
    const s = quickHairSetupSchema(TODAY);
    expect(s.safeParse({ frequency: 'twice_a_week', lastWash: TODAY, trim: true }).success).toBe(
      true,
    );
    expect(s.safeParse({ frequency: 'other', lastWash: TODAY, trim: true }).success).toBe(false);
    expect(
      s.safeParse({ frequency: 'every_day', lastWash: '2026-10-08', trim: false }).success,
    ).toBe(false);
  });
});

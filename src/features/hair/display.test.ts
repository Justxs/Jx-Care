import type { TFunction } from 'i18next';

import { i18n } from '@/i18n';
import { makeFormatter } from '@/i18n/useFormat';
import { nextDue, quickSetupToTask } from '@/lib/hair';

import {
  defaultHairName,
  dueLabel,
  formNextDue,
  frequencyLabel,
  hairTaskIcon,
  isDefaultHairName,
  lastDoneLabel,
  quickSetupNextDue,
} from './display';
import { emptyHairTaskForm, quickWashFrequencies } from './schema';

const TODAY = '2026-10-07'; // a Wednesday

const tFor = (lang: 'en' | 'lt') => i18n.getFixedT(lang) as unknown as TFunction;
const fFor = (lang: 'en' | 'lt') =>
  makeFormatter({ lang, locale: 'en-GB', currency: 'EUR', today: TODAY, uses24h: true });

const en = { t: tFor('en'), f: fFor('en') };
const lt = { t: tFor('lt'), f: fFor('lt') };

const interval = (everyNDays: number, intervalUnit: 'days' | 'weeks' = 'days') => ({
  scheduleKind: 'interval' as const,
  everyNDays,
  intervalUnit,
  daysOfWeek: null,
});
const setDays = (daysOfWeek: number[]) => ({
  scheduleKind: 'days' as const,
  everyNDays: null,
  intervalUnit: 'days' as const,
  daysOfWeek,
});

describe('frequencyLabel', () => {
  it('says every few days, weeks or the set days', () => {
    expect(frequencyLabel(interval(3), en.f, en.t)).toBe('Every 3 days');
    expect(frequencyLabel(interval(1), en.f, en.t)).toBe('Every day');
    expect(frequencyLabel(interval(56, 'weeks'), en.f, en.t)).toBe('Every 8 weeks');
    expect(frequencyLabel(interval(7, 'weeks'), en.f, en.t)).toBe('Every week');
    // A day count that is not whole weeks shows in days.
    expect(frequencyLabel(interval(10, 'weeks'), en.f, en.t)).toBe('Every 10 days');
    expect(frequencyLabel(setDays([4, 1]), en.f, en.t)).toBe('Mon, Thu');
    expect(frequencyLabel(setDays([1, 2, 3, 4, 5, 6, 7]), en.f, en.t)).toBe('Every day');
  });

  it('uses Lithuanian plurals', () => {
    expect(frequencyLabel(interval(3), lt.f, lt.t)).toBe('Kas 3 dienas');
    expect(frequencyLabel(interval(10), lt.f, lt.t)).toBe('Kas 10 dienų');
    expect(frequencyLabel(interval(21), lt.f, lt.t)).toBe('Kas 21 dieną');
    expect(frequencyLabel(interval(56, 'weeks'), lt.f, lt.t)).toBe('Kas 8 savaites');
    expect(frequencyLabel(interval(7, 'weeks'), lt.f, lt.t)).toBe('Kas savaitę');
  });
});

describe('dueLabel and lastDoneLabel', () => {
  it('shows next, due today and overdue (in warning)', () => {
    expect(
      dueLabel({ nextDue: '2026-10-09', state: 'upcoming', overdueDays: 0 }, en.f, en.t),
    ).toEqual({ text: 'Next 9 Oct', warning: false });
    expect(dueLabel({ nextDue: TODAY, state: 'due', overdueDays: 0 }, en.f, en.t)).toEqual({
      text: 'Due today',
      warning: false,
    });
    expect(
      dueLabel({ nextDue: '2026-10-06', state: 'overdue', overdueDays: 1 }, en.f, en.t),
    ).toEqual({ text: 'Overdue 1 day', warning: true });
    expect(
      dueLabel({ nextDue: '2026-10-04', state: 'overdue', overdueDays: 3 }, lt.f, lt.t).text,
    ).toBe('Vėluoja 3 dienas');
  });

  it('writes last done as a date', () => {
    expect(lastDoneLabel('2026-08-18', en.f, en.t)).toBe('Last 18 Aug');
    expect(lastDoneLabel('2026-08-18', lt.f, lt.t)).toBe('Paskutinį kartą 2026-08-18');
    expect(lastDoneLabel(null, en.f, en.t)).toBe('Not done yet');
  });
});

describe('icons and default names', () => {
  it('has an icon per kind and none for plain other care', () => {
    expect(hairTaskIcon('wash', null)).toBe('droplets');
    expect(hairTaskIcon('other', 'trim')).toBe('scissors');
    expect(hairTaskIcon('other', 'colour')).toBe('palette');
    expect(hairTaskIcon('other', 'mask')).toBe('flask-round');
    expect(hairTaskIcon('other', 'other')).toBeNull();
  });

  it('knows the default names, so picking a kind only replaces those', () => {
    expect(defaultHairName('wash', null, en.t)).toBe('Wash');
    expect(defaultHairName('other', 'trim', en.t)).toBe('Trim');
    expect(defaultHairName('other', 'mask', en.t)).toBe('Hair mask');
    expect(defaultHairName('other', 'other', en.t)).toBe('');
    expect(isDefaultHairName('', en.t)).toBe(true);
    expect(isDefaultHairName(' Trim ', en.t)).toBe(true);
    expect(isDefaultHairName('Henna', en.t)).toBe(false);
  });
});

describe('formNextDue', () => {
  const base = emptyHairTaskForm(TODAY);

  it('matches nextDue for intervals in days and weeks and for set days', () => {
    const lite = {
      id: 0,
      kind: 'wash' as const,
      otherKind: null,
      active: true,
      createdDay: TODAY,
    };
    expect(formNextDue({ ...base, interval: '3', lastDoneAt: '2026-10-06' }, TODAY)).toBe(
      nextDue({ ...lite, ...interval(3), lastDoneAt: '2026-10-06' }),
    );
    expect(formNextDue({ ...base, interval: '3', lastDoneAt: '2026-10-06' }, TODAY)).toBe(
      '2026-10-09',
    );
    expect(
      formNextDue({ ...base, kind: 'other', interval: '8', intervalUnit: 'weeks' }, TODAY),
    ).toBe('2026-12-02');
    expect(formNextDue({ ...base, scheduleKind: 'days', daysOfWeek: [1, 4] }, TODAY)).toBe(
      '2026-10-08',
    );
  });

  it('is null until the schedule and the day are filled in', () => {
    expect(formNextDue({ ...base, interval: '' }, TODAY)).toBeNull();
    expect(formNextDue({ ...base, interval: '0' }, TODAY)).toBeNull();
    expect(formNextDue({ ...base, scheduleKind: 'days', daysOfWeek: [] }, TODAY)).toBeNull();
    expect(formNextDue({ ...base, lastDoneAt: '' }, TODAY)).toBeNull();
  });
});

describe('quickSetupNextDue', () => {
  it('gives the next wash for each frequency chip, twice a week on Mon and Thu', () => {
    const lastWash = '2026-10-06'; // Tuesday
    const expected = {
      every_day: '2026-10-07',
      every_2_days: '2026-10-08',
      every_3_days: '2026-10-09',
      twice_a_week: '2026-10-08', // Thursday
      once_a_week: '2026-10-13',
    } as const;
    for (const frequency of quickWashFrequencies) {
      expect(quickSetupNextDue(frequency, lastWash)).toBe(expected[frequency]);
    }
    expect(quickSetupToTask('twice_a_week').daysOfWeek).toEqual([1, 4]);
    // From a Thursday, twice a week comes round on Monday.
    expect(quickSetupNextDue('twice_a_week', '2026-10-08')).toBe('2026-10-12');
  });
});

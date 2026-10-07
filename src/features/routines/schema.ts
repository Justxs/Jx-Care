import { z } from 'zod';

import { stepScheduleKinds, timesOfDay, type TimeOfDay } from '@/db/enums';
import { isValidDay } from '@/lib/appDay';
import { tidy } from '@/lib/text';

/** Wait after a step (spec R3): none, 30 s, 1, 2, 5, 10, 15, 20 min. */
export const waitSecondsOptions = [0, 30, 60, 120, 300, 600, 900, 1200] as const;

/** `sortTime` for the fixed times of day; a custom time of day brings its own (spec R2). */
export const defaultSortTimes: Record<Exclude<TimeOfDay, 'custom'>, string> = {
  morning: '07:00',
  evening: '21:00',
};

export const everyDay = [1, 2, 3, 4, 5, 6, 7];

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isHhmm = (v: string) => HHMM.test(v);

const weekday = z.number().int().min(1).max(7);
const sortedDays = (days: readonly number[]) => [...new Set(days)].sort((a, b) => a - b);

/** "3" or 3 → 3; empty or null → null; anything else → NaN (caught below). */
function toInt(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isInteger(v) ? v : Number.NaN;
  const s = v.trim();
  if (s === '') return null;
  return /^\d+$/.test(s) ? Number(s) : Number.NaN;
}

/** One step as the step editor sheet (R3) holds it. `id` is set for steps already saved. */
export const stepSchema = z
  .object({
    id: z.number().int().nullable().optional(),
    productId: z.number().int().nullable(),
    note: z
      .string()
      .nullable()
      .transform((v) => tidy(v ?? ''))
      .refine((v) => v.length <= 100, 'routines.errors.noteLong')
      .transform((v) => (v === '' ? null : v)),
    scheduleKind: z.enum(stepScheduleKinds),
    daysOfWeek: z.array(weekday).nullable(),
    everyNDays: z.union([z.number(), z.string()]).nullable().transform(toInt),
    startDate: z.string().nullable(),
    waitSeconds: z
      .number()
      .refine(
        (v) => (waitSecondsOptions as readonly number[]).includes(v),
        'routines.errors.waitSeconds',
      ),
  })
  .superRefine((s, ctx) => {
    if (s.scheduleKind === 'days' && (s.daysOfWeek ?? []).length === 0) {
      ctx.addIssue({ code: 'custom', path: ['daysOfWeek'], message: 'routines.errors.stepDays' });
    }
    if (s.scheduleKind === 'interval') {
      const n = s.everyNDays;
      if (n === null || Number.isNaN(n) || n < 2 || n > 60) {
        ctx.addIssue({
          code: 'custom',
          path: ['everyNDays'],
          message: 'routines.errors.everyNDays',
        });
      }
      if (!s.startDate || !isValidDay(s.startDate)) {
        ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'routines.errors.startDate' });
      }
    }
  })
  .transform((s) => ({
    id: s.id ?? null,
    productId: s.productId,
    note: s.note,
    scheduleKind: s.scheduleKind,
    // Only the fields of the chosen schedule are kept.
    daysOfWeek: s.scheduleKind === 'days' ? sortedDays(s.daysOfWeek ?? []) : null,
    everyNDays: s.scheduleKind === 'interval' ? s.everyNDays : null,
    startDate: s.scheduleKind === 'interval' ? s.startDate : null,
    waitSeconds: s.waitSeconds,
  }));

/** One step inside a routine that runs on `routineDays`: Set days can only pick those (R3). */
export function stepSchemaWithin(routineDays: readonly number[]) {
  return stepSchema.superRefine((s, ctx) => {
    if (s.daysOfWeek?.some((d) => !routineDays.includes(d))) {
      ctx.addIssue({
        code: 'custom',
        path: ['daysOfWeek'],
        message: 'routines.errors.stepDaysOutside',
      });
    }
  });
}

/**
 * The routine editor (spec R2) with its steps (R3). Messages are i18n keys under
 * `routines.errors`. Morning and evening get their fixed `sortTime`; custom keeps its own.
 */
export const routineSchema = z
  .object({
    name: z
      .string()
      .transform(tidy)
      .refine((v) => v.length > 0, 'routines.errors.nameRequired')
      .refine((v) => v.length <= 60, 'routines.errors.nameLong'),
    timeOfDay: z.enum(timesOfDay, { message: 'routines.errors.timeOfDayRequired' }),
    customName: z
      .string()
      .nullable()
      .transform((v) => tidy(v ?? '')),
    sortTime: z.string(),
    daysOfWeek: z.array(weekday),
    reminderTime: z.string().nullable(),
    steps: z.array(stepSchema),
  })
  .superRefine((r, ctx) => {
    if (r.timeOfDay === 'custom') {
      if (r.customName.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['customName'],
          message: 'routines.errors.customNameRequired',
        });
      } else if (r.customName.length > 30) {
        ctx.addIssue({
          code: 'custom',
          path: ['customName'],
          message: 'routines.errors.customNameLong',
        });
      }
      if (!isHhmm(r.sortTime)) {
        ctx.addIssue({ code: 'custom', path: ['sortTime'], message: 'routines.errors.customTime' });
      }
    }
    if (r.daysOfWeek.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['daysOfWeek'], message: 'routines.errors.days' });
    }
    if (r.reminderTime !== null && !isHhmm(r.reminderTime)) {
      ctx.addIssue({
        code: 'custom',
        path: ['reminderTime'],
        message: 'routines.errors.reminderTime',
      });
    }
    if (r.steps.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['steps'], message: 'routines.errors.steps' });
    }
    r.steps.forEach((s, i) => {
      if (s.daysOfWeek && s.daysOfWeek.some((d) => !r.daysOfWeek.includes(d))) {
        ctx.addIssue({
          code: 'custom',
          path: ['steps', i, 'daysOfWeek'],
          message: 'routines.errors.stepDaysOutside',
        });
      }
    });
  })
  .transform((r) => ({
    name: r.name,
    timeOfDay: r.timeOfDay,
    customName: r.timeOfDay === 'custom' ? r.customName : null,
    sortTime: r.timeOfDay === 'custom' ? r.sortTime : defaultSortTimes[r.timeOfDay],
    daysOfWeek: sortedDays(r.daysOfWeek),
    reminderTime: r.reminderTime,
    steps: r.steps,
  }));

export type StepFormValues = z.input<typeof stepSchema>;
export type StepInput = z.output<typeof stepSchema>;
export type RoutineFormValues = z.input<typeof routineSchema>;
export type RoutineInput = z.output<typeof routineSchema>;

export const emptyStep: StepFormValues = {
  id: null,
  productId: null,
  note: null,
  scheduleKind: 'always',
  daysOfWeek: null,
  everyNDays: null,
  startDate: null,
  waitSeconds: 0,
};

export function emptyRoutineForm(timeOfDay: TimeOfDay = 'morning'): RoutineFormValues {
  return {
    name: '',
    timeOfDay,
    customName: null,
    sortTime: timeOfDay === 'custom' ? '12:00' : defaultSortTimes[timeOfDay],
    daysOfWeek: everyDay,
    reminderTime: null,
    steps: [],
  };
}

import { z } from 'zod';

import { hairOtherKinds, hairScheduleKinds, hairTaskKinds, intervalUnits } from '@/db/enums';
import type { HairOtherKind, HairScheduleKind, HairTaskKind, IntervalUnit } from '@/db/enums';
import { isValidDay } from '@/lib/appDay';
import type { QuickWashFrequency } from '@/lib/hair';
import { tidy } from '@/lib/text';

export const HAIR_NAME_MAX = 40;
export const HAIR_NOTE_MAX = 280;
export const HAIR_INTERVAL_MAX_DAYS = 365;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** What `saveHairTask` stores. `everyNDays` is always in days, whatever unit the form showed. */
export type HairTaskInput = {
  name: string;
  kind: HairTaskKind;
  otherKind: HairOtherKind | null;
  productIds: number[];
  scheduleKind: HairScheduleKind;
  everyNDays: number | null;
  intervalUnit: IntervalUnit;
  daysOfWeek: number[] | null;
  /** Left out on an update: the stored "Last done" stays (it may have moved since the form opened). */
  lastDoneAt?: string;
  reminderTime: string | null;
};

/** "3" → 3; empty or anything that is not a whole number → null. */
export function parseWhole(text: string): number | null {
  const v = text.trim();
  return /^\d+$/.test(v) ? Number(v) : null;
}

/**
 * The hair task editor's values (R5) and its rules. Messages are i18n keys under `hair.errors`.
 * `interval` is the number as typed, in `intervalUnit`s. Parse with a `today` so "Last done"
 * can't be in the future.
 */
export function hairTaskSchema(today: string) {
  return z
    .object({
      kind: z.enum(hairTaskKinds, { message: 'hair.errors.kindRequired' }),
      otherKind: z.enum(hairOtherKinds).nullable(),
      name: z
        .string()
        .transform(tidy)
        .refine((v) => v.length > 0, 'hair.errors.nameRequired')
        .refine((v) => v.length <= HAIR_NAME_MAX, 'hair.errors.nameLong'),
      productIds: z.array(z.number().int().positive()),
      scheduleKind: z.enum(hairScheduleKinds),
      interval: z.string(),
      intervalUnit: z.enum(intervalUnits),
      daysOfWeek: z.array(z.number().int().min(1).max(7)),
      lastDoneAt: z
        .string()
        .refine(isValidDay, { message: 'hair.errors.date', abort: true })
        .refine((v) => v <= today, 'hair.errors.lastDoneFuture'),
      reminderOn: z.boolean(),
      reminderTime: z.string().nullable(),
    })
    .superRefine((v, ctx) => {
      if (v.scheduleKind === 'interval') {
        const n = parseWhole(v.interval);
        if (n === null) {
          ctx.addIssue({
            code: 'custom',
            path: ['interval'],
            message: 'hair.errors.intervalNumber',
          });
        } else {
          const days = n * (v.intervalUnit === 'weeks' ? 7 : 1);
          if (days < 1 || days > HAIR_INTERVAL_MAX_DAYS) {
            ctx.addIssue({
              code: 'custom',
              path: ['interval'],
              message: 'hair.errors.intervalRange',
            });
          }
        }
      } else if (v.daysOfWeek.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['daysOfWeek'], message: 'hair.errors.daysRequired' });
      }
      if (v.reminderOn && !TIME.test(v.reminderTime ?? '')) {
        ctx.addIssue({ code: 'custom', path: ['reminderTime'], message: 'hair.errors.time' });
      }
    })
    .transform((v): HairTaskInput => ({
      name: v.name,
      kind: v.kind,
      otherKind: v.kind === 'wash' ? null : (v.otherKind ?? 'other'),
      // Products are for washes only (R5).
      productIds: v.kind === 'wash' ? [...new Set(v.productIds)] : [],
      scheduleKind: v.scheduleKind,
      everyNDays:
        v.scheduleKind === 'interval'
          ? (parseWhole(v.interval) ?? 0) * (v.intervalUnit === 'weeks' ? 7 : 1)
          : null,
      intervalUnit: v.scheduleKind === 'interval' ? v.intervalUnit : 'days',
      daysOfWeek:
        v.scheduleKind === 'days' ? [...new Set(v.daysOfWeek)].toSorted((a, b) => a - b) : null,
      lastDoneAt: v.lastDoneAt,
      reminderTime: v.reminderOn ? v.reminderTime : null,
    }));
}

export type HairTaskFormValues = z.input<ReturnType<typeof hairTaskSchema>>;

/** A new task's form: a wash every 3 days, last done today, no reminder. */
export function emptyHairTaskForm(today: string): HairTaskFormValues {
  return {
    kind: 'wash',
    otherKind: null,
    name: '',
    productIds: [],
    scheduleKind: 'interval',
    interval: '3',
    intervalUnit: 'days',
    daysOfWeek: [],
    lastDoneAt: today,
    reminderOn: false,
    reminderTime: null,
  };
}

/** The editor's values for a saved task; an interval in weeks shows as weeks again. */
export function hairTaskToForm(task: HairTaskInput): HairTaskFormValues {
  const weeks = task.intervalUnit === 'weeks' && (task.everyNDays ?? 0) % 7 === 0;
  return {
    kind: task.kind,
    otherKind: task.otherKind,
    name: task.name,
    productIds: task.productIds,
    scheduleKind: task.scheduleKind,
    interval: task.everyNDays == null ? '' : String(weeks ? task.everyNDays / 7 : task.everyNDays),
    intervalUnit: weeks ? 'weeks' : 'days',
    daysOfWeek: task.daysOfWeek ?? [],
    lastDoneAt: task.lastDoneAt ?? '',
    reminderOn: task.reminderTime !== null,
    reminderTime: task.reminderTime,
  };
}

/** T3 Hair task done: the day (today or earlier), products and an optional note. */
export function hairDoneSchema(today: string) {
  return z.object({
    day: z
      .string()
      .refine(isValidDay, { message: 'hair.errors.date', abort: true })
      .refine((v) => v <= today, 'hair.errors.doneFuture'),
    productIds: z.array(z.number().int().positive()),
    note: z
      .string()
      .transform(tidy)
      .refine((v) => v.length <= HAIR_NOTE_MAX, 'hair.errors.noteLong')
      .transform((v) => (v === '' ? null : v)),
  });
}

export type HairDoneFormValues = z.input<ReturnType<typeof hairDoneSchema>>;
/** The quick setup's frequency chips (R5); "Other" opens the full editor instead. */
export const quickWashFrequencies = [
  'every_day',
  'every_2_days',
  'every_3_days',
  'twice_a_week',
  'once_a_week',
] as const satisfies readonly QuickWashFrequency[];

/** Quick hair setup (R5): "Last wash" is today or earlier. */
export function quickHairSetupSchema(today: string) {
  return z.object({
    frequency: z.enum(quickWashFrequencies),
    lastWash: z
      .string()
      .refine(isValidDay, { message: 'hair.errors.date', abort: true })
      .refine((v) => v <= today, 'hair.errors.lastDoneFuture'),
    trim: z.boolean(),
  });
}

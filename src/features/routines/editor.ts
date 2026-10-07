import type { TimeOfDay } from '@/db/enums';

import type { RoutineItem, SaveRoutineInput } from './repo';
import {
  defaultSortTimes,
  emptyStep,
  stepSchema,
  type RoutineFormValues,
  type RoutineInput,
  type StepFormValues,
} from './schema';

/**
 * Helpers for the R2 editor. Steps not saved yet carry a negative id while they are edited, so
 * every row has a stable key for dragging; the repository inserts any id it doesn't know.
 */

export const isNewStepId = (id: number | null | undefined) => id == null || id < 0;

/** The next free negative id for a new step. */
export function nextTempStepId(steps: readonly StepFormValues[]): number {
  return Math.min(0, ...steps.map((s) => s.id ?? 0)) - 1;
}

/** Gives steps without an id (a template draft) a temporary negative one. */
export function withStepKeys(values: RoutineFormValues): RoutineFormValues {
  const steps: StepFormValues[] = [];
  for (const s of values.steps) {
    steps.push(s.id == null ? { ...s, id: nextTempStepId([...steps, ...values.steps]) } : s);
  }
  return { ...values, steps };
}

export function newStep(steps: readonly StepFormValues[]): StepFormValues {
  return { ...emptyStep, id: nextTempStepId(steps) };
}

/** Editor values for a saved routine. */
export function routineToForm(r: RoutineItem): RoutineFormValues {
  return {
    name: r.name,
    timeOfDay: r.timeOfDay,
    customName: r.customName,
    sortTime: r.sortTime,
    daysOfWeek: [...r.daysOfWeek],
    reminderTime: r.reminderTime,
    steps: r.steps.map((s) => ({
      id: s.id,
      productId: s.productId,
      note: s.note,
      scheduleKind: s.scheduleKind,
      daysOfWeek: s.daysOfWeek ? [...s.daysOfWeek] : null,
      everyNDays: s.everyNDays,
      startDate: s.startDate,
      waitSeconds: s.waitSeconds,
    })),
  };
}

/** The parsed form as the repository takes it: temporary step ids become new steps. */
export function toSaveInput(value: RoutineInput, id: number | null): SaveRoutineInput {
  return {
    ...value,
    id,
    steps: value.steps.map((s) => (isNewStepId(s.id) ? { ...s, id: null } : s)),
  };
}

/** `sortTime` when the time of day changes: fixed for morning and evening, kept for custom. */
export function sortTimeFor(timeOfDay: TimeOfDay, current: string): string {
  return timeOfDay === 'custom' ? current : defaultSortTimes[timeOfDay];
}

/** The reminder time the switch starts with: the routine's own time. */
export function defaultReminderTime(values: Pick<RoutineFormValues, 'timeOfDay' | 'sortTime'>) {
  return sortTimeFor(values.timeOfDay, values.sortTime);
}

/**
 * What is wrong with a step as the routine stands (an i18n key), or null. Shown on the step's row,
 * because the step editor that would show it is closed.
 */
export function stepProblem(step: StepFormValues, routineDays: readonly number[]): string | null {
  const parsed = stepSchema.safeParse(step);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? null;
  const days = parsed.data.daysOfWeek;
  if (days && days.some((d) => !routineDays.includes(d))) return 'routines.errors.stepDaysOutside';
  return null;
}

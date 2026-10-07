import type { TFunction } from 'i18next';

import type { DayRoutine, StepProduct, TodayRoutineGroup } from '@/features/routines/repo';
import type { Formatter } from '@/i18n/useFormat';

/** "Morning", "Evening" or the custom time of day's own name. */
export function timeOfDayName(
  group: Pick<TodayRoutineGroup, 'timeOfDay' | 'customName'>,
  t: TFunction,
): string {
  if (group.timeOfDay === 'custom') return group.customName ?? t('common.custom');
  return t(`common.${group.timeOfDay}`);
}

/** "Reminder at 07:30 · 4 steps" or "No reminder · 2 steps" (due steps today). */
export function routineMeta(r: DayRoutine, f: Formatter, t: TFunction): string {
  const reminder = r.reminderTime
    ? t('today.routine.reminderAt', { time: f.time(r.reminderTime) })
    : t('today.routine.noReminder');
  return `${reminder} · ${t('today.routine.steps', { count: r.progress.due })}`;
}

/** "SPF 50 fluid expired 2 Oct", or "2 products expired" for several. Null when none. */
export function expiredText(
  products: readonly StepProduct[],
  f: Formatter,
  t: TFunction,
): string | null {
  if (products.length === 0) return null;
  if (products.length > 1) return t('today.routine.expiredMany', { count: products.length });
  const p = products[0]!;
  return p.effectiveExpiry
    ? t('today.routine.expiredOne', { name: p.name, date: f.date(p.effectiveExpiry) })
    : t('today.routine.expiredMany', { count: 1 });
}

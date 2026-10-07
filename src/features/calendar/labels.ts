import type { TFunction } from 'i18next';

import type { SkinDayStatus } from '@/lib/streak';

import { monthParts } from './month';

/** "October 2026" / "2026 m. spalis". */
export function monthTitle(t: TFunction, month: string): string {
  const p = monthParts(month);
  return t('calendar.monthTitle', { month: t(`calendar.months.${p.month}`), year: p.year });
}

/** "5 October" / "spalio 5 d.", for spoken day labels. */
export function dayLabel(t: TFunction, day: string): string {
  const [, m = 1, d = 1] = day.split('-').map(Number);
  return t('calendar.dayLabel', { day: d, month: t(`calendar.monthsOf.${m}`) });
}

/**
 * A grid day's spoken label: "5 October, partly done", "6 October, today, nothing done yet".
 * A past day with routines set and none finished is "not done", never "missed". Days with
 * nothing due and days still to come carry no status.
 */
export function dayCellLabel(
  t: TFunction,
  day: string,
  today: string,
  status: SkinDayStatus | undefined,
): string {
  const parts = [dayLabel(t, day)];
  if (day === today) parts.push(t('calendar.isToday'));
  if (status && status !== 'none' && day <= today) parts.push(t(`calendar.status.${status}`));
  return parts.join(', ');
}

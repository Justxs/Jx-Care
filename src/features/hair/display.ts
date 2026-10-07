import type { TFunction } from 'i18next';

import type { IconName } from '@/components/ui/icon';
import type { HairOtherKind, HairTaskKind } from '@/db/enums';
import type { Formatter } from '@/i18n/useFormat';
import { isValidDay } from '@/lib/appDay';
import { nextDue, quickSetupToTask, type HairState, type QuickWashFrequency } from '@/lib/hair';

import type { HairTaskFormValues } from './schema';

/** Words and next-due lines for hair rows, the editor preview and the quick setup (R1, R5). */

type Schedule = {
  scheduleKind: 'interval' | 'days';
  everyNDays: number | null;
  intervalUnit: 'days' | 'weeks';
  daysOfWeek: number[] | null;
};

/** "Every 3 days", "Every 8 weeks", "Mon, Thu", "Every day". */
export function frequencyLabel(s: Schedule, f: Formatter, t: TFunction): string {
  if (s.scheduleKind === 'days') {
    const days = s.daysOfWeek ?? [];
    return days.length === 7 ? t('common.everyDay') : f.weekdayList(days);
  }
  const n = Math.max(1, s.everyNDays ?? 1);
  if (s.intervalUnit === 'weeks' && n % 7 === 0) {
    const weeks = n / 7;
    return weeks === 1
      ? t('hair.frequency.everyWeek')
      : t('hair.frequency.everyNWeeks', { count: weeks });
  }
  return n === 1 ? t('common.everyDay') : t('hair.frequency.everyNDays', { count: n });
}

/** "Next 9 Oct", "Due today", "Overdue 1 day" (the last one in `warning`). */
export function dueLabel(
  row: { nextDue: string; state: HairState; overdueDays: number },
  f: Formatter,
  t: TFunction,
): { text: string; warning: boolean } {
  switch (row.state) {
    case 'upcoming':
      return { text: t('hair.row.next', { date: f.date(row.nextDue) }), warning: false };
    case 'due':
      return { text: t('hair.row.dueToday'), warning: false };
    case 'overdue':
      return { text: t('hair.row.overdue', { count: row.overdueDays }), warning: true };
  }
}

/** "Last 18 Aug": always a date, never "7 weeks ago". */
export function lastDoneLabel(lastDoneAt: string | null, f: Formatter, t: TFunction): string {
  return lastDoneAt ? t('hair.row.last', { date: f.date(lastDoneAt) }) : t('hair.row.never');
}

/** Bare `ink-muted` icon per kind; plain "other" care has none. */
export function hairTaskIcon(kind: HairTaskKind, otherKind: HairOtherKind | null): IconName | null {
  if (kind === 'wash') return 'droplets';
  switch (otherKind) {
    case 'trim':
      return 'scissors';
    case 'colour':
      return 'palette';
    case 'mask':
      return 'flask-round';
    default:
      return null;
  }
}

/** "3" → 3; anything that is not a whole number above 0 → null. */
function wholeNumber(text: string): number | null {
  const v = text.trim();
  if (!/^\d+$/.test(v)) return null;
  const n = Number(v);
  return n >= 1 ? n : null;
}

/**
 * The editor's "Next due" day for the values as they are, from `nextDue` (task 007). Null while
 * the schedule or the last done day is not filled in yet.
 */
export function formNextDue(v: HairTaskFormValues, today: string): string | null {
  if (!isValidDay(v.lastDoneAt)) return null;
  let everyNDays: number | null = null;
  let daysOfWeek: number[] | null = null;
  if (v.scheduleKind === 'interval') {
    const n = wholeNumber(v.interval);
    if (n === null) return null;
    everyNDays = n * (v.intervalUnit === 'weeks' ? 7 : 1);
  } else {
    if (v.daysOfWeek.length === 0) return null;
    daysOfWeek = v.daysOfWeek;
  }
  return nextDue({
    id: 0,
    kind: v.kind,
    otherKind: v.otherKind,
    scheduleKind: v.scheduleKind,
    everyNDays,
    daysOfWeek,
    lastDoneAt: v.lastDoneAt,
    active: true,
    createdDay: today,
  });
}

/** The quick setup's "Next wash" day, from `quickSetupToTask` + `nextDue`. */
export function quickSetupNextDue(frequency: QuickWashFrequency, lastWash: string): string {
  return nextDue({
    id: 0,
    kind: 'wash',
    otherKind: null,
    ...quickSetupToTask(frequency),
    lastDoneAt: lastWash,
    active: true,
    createdDay: lastWash,
  });
}

/** Default task names per kind (R5): picking a kind fills the name unless one was typed. */
export function defaultHairName(
  kind: HairTaskKind,
  otherKind: HairOtherKind | null,
  t: TFunction,
): string {
  if (kind === 'wash') return t('hair.defaultNames.wash');
  switch (otherKind) {
    case 'trim':
      return t('hair.defaultNames.trim');
    case 'colour':
      return t('hair.defaultNames.colour');
    case 'mask':
      return t('hair.defaultNames.mask');
    default:
      return '';
  }
}

/** True when the name is empty or one of the default names, so picking a kind may replace it. */
export function isDefaultHairName(name: string, t: TFunction): boolean {
  const v = name.trim();
  if (v === '') return true;
  return (
    [
      defaultHairName('wash', null, t),
      defaultHairName('other', 'trim', t),
      defaultHairName('other', 'colour', t),
      defaultHairName('other', 'mask', t),
    ] as string[]
  ).includes(v);
}

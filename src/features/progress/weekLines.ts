import type { TFunction } from 'i18next';

import type { ProgressArea } from '@/db/enums';
import { tagLabel } from '@/features/condition/labels';

import type { WeekContext } from './types';

/** How many condition tags the summary names ("Mostly Calm, 2 days Breakout"). */
const MAX_TAGS = 3;

/**
 * C6 "What changed this week" as lines of text: routines done out of due ("Evening routine 5 of
 * 7 days") or hair tasks done, products started and finished, and the condition log summary.
 * Empty when nothing happened that week.
 */
export function weekContextLines(t: TFunction, area: ProgressArea, ctx: WeekContext): string[] {
  const lines: string[] = [];
  for (const r of ctx.routines) {
    lines.push(
      t(`progress.week.${r.timeOfDay}`, {
        count: r.due,
        done: r.done,
        name: r.customName ?? t('common.custom'),
      }),
    );
  }
  for (const task of ctx.hairTasks) {
    lines.push(t('progress.week.hairTask', { count: task.done, name: task.name }));
  }
  for (const p of ctx.started) lines.push(t('progress.week.started', { name: p.name }));
  for (const p of ctx.stopped) lines.push(t('progress.week.stopped', { name: p.name }));

  const { daysLogged, tags } = ctx.condition;
  if (daysLogged > 0 && tags.length > 0) {
    const parts = tags.slice(0, MAX_TAGS).map(({ tag, count }, i) => {
      const label = tagLabel(t, area, tag);
      // "Mostly" only when the most frequent tag was logged on more than half the days.
      return i === 0 && count * 2 > daysLogged
        ? t('progress.week.mostly', { tag: label })
        : t('progress.week.tagDays', { count, tag: label });
    });
    lines.push(parts.join(', '));
  }
  return lines;
}

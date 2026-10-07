import type { TFunction } from 'i18next';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { ConditionArea } from '@/db/enums';
import { dayLabel } from '@/features/calendar/labels';

/** A tag's word: skin tags are shared (`common.tags`), hair tags are the condition log's own. */
export function tagLabel(t: TFunction, area: ConditionArea, tag: string): string {
  return area === 'skin' ? t(`common.tags.${tag}`) : t(`condition.hairTags.${tag}`);
}

export function useTagLabel(): (area: ConditionArea, tag: string) => string {
  const { t } = useTranslation();
  return useCallback((area: ConditionArea, tag: string) => tagLabel(t, area, tag), [t]);
}

/** "breakout", "breakout and oily", "breakout, oily and dry". */
export function spokenList(t: TFunction, items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return t('condition.spokenList', {
    items: items.slice(0, -1).join(', '),
    last: items.at(-1),
  });
}

/**
 * A Condition view day's spoken label: "5 October, breakout and oily" (states in severity
 * order, as words), with "today" on today. Days with nothing logged carry the date only.
 */
export function conditionDayLabel(
  t: TFunction,
  day: string,
  today: string,
  states: readonly string[] | undefined,
): string {
  const parts = [dayLabel(t, day)];
  if (day === today) parts.push(t('calendar.isToday'));
  if (states && states.length > 0) {
    parts.push(
      spokenList(
        t,
        states.map((s) => tagLabel(t, 'skin', s).toLocaleLowerCase()),
      ),
    );
  }
  return parts.join(', ');
}

import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

import { Text } from './text';

export const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** "Monday, Wednesday" or "Every day", for screen readers. */
export function useWeekdaysLabel() {
  const { t } = useTranslation();
  return (days: readonly number[]) => {
    const set = new Set(days);
    if (ISO_WEEKDAYS.every((d) => set.has(d))) return t('common.everyDay');
    if (set.size === 0) return t('a11y.noDays');
    return ISO_WEEKDAYS.filter((d) => set.has(d))
      .map((d) => t(`weekdays.long.${d}`))
      .join(', ');
  };
}

export type WeekdayDotsProps = {
  /** ISO weekdays, 1 = Monday. */
  value: readonly number[];
  accessibilityLabel?: string;
  className?: string;
};

/** Read-only schedule preview: seven fixed-width letters, Monday first. */
export function WeekdayDots({ value, accessibilityLabel, className }: WeekdayDotsProps) {
  const { t } = useTranslation();
  const label = useWeekdaysLabel();
  const set = new Set(value);
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? label(value)}
      className={cn('flex-row gap-1', className)}
    >
      {ISO_WEEKDAYS.map((d) => {
        const on = set.has(d);
        return (
          <View
            key={d}
            className={cn(
              'h-[20px] w-[20px] items-center justify-center rounded-full',
              on && 'bg-accent-soft',
            )}
          >
            <Text className={cn('text-tiny', on ? 'text-accent' : 'text-ink-muted')}>
              {t(`weekdays.letter.${d}`)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

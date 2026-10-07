import { useSelector } from '@tanstack/react-store';
import type { TFunction } from 'i18next';
import { useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { StreakCard } from '@/components/ui/streak';
import { Text } from '@/components/ui/text';
import { useHairMonth, useHairStreak, useHasHairTask, useHasWashTask } from '@/features/hair/api';
import { hairTaskIcon } from '@/features/hair/display';
import type { HairDayMark } from '@/lib/hair';
import { cn } from '@/lib/cn';
import { appStore } from '@/state/app';

import { dayLabel } from '../labels';
import { MonthGrid } from './MonthGrid';
import { ProgressPhotosRow } from './ProgressPhotosRow';
import type { CalendarMonthProps } from './SkinCalendar';

/** At most this many other-care icons fit beside the wash mark in a 360 pt wide cell. */
const MAX_ICONS = 2;

type WashMark = 'late' | 'done' | 'overdue' | 'due' | 'none';

/** One wash mark per day: a log wins over a due day; late wins over on time. */
export function washMarkOf(mark: HairDayMark | undefined): WashMark {
  if (!mark) return 'none';
  if (mark.washLate) return 'late';
  if (mark.washDone) return 'done';
  if (mark.overdue) return 'overdue';
  if (mark.washDue) return 'due';
  return 'none';
}

/**
 * "9 October, wash due", "5 October, wash done late, trim done". Every flag is spoken, so two
 * washes on one day (one on time, one late) both read.
 */
export function hairDayLabel(
  t: TFunction,
  day: string,
  today: string,
  mark: HairDayMark | undefined,
): string {
  const parts = [dayLabel(t, day)];
  if (day === today) parts.push(t('calendar.isToday'));
  if (mark) {
    if (mark.washDone) parts.push(t('hair.calendar.washDone'));
    if (mark.washLate) parts.push(t('hair.calendar.washLate'));
    if (mark.overdue) parts.push(t('hair.calendar.overdue'));
    if (mark.washDue && !mark.washDone && !mark.washLate) parts.push(t('hair.calendar.washDue'));
    for (const kind of mark.otherCare) parts.push(t(`hair.calendar.otherDone.${kind}`));
  }
  return parts.join(', ');
}

/**
 * The 12 pt hair mark: wash done is a filled `hair` dot, a late wash the same dot in a `warning`
 * ring, a due day a `hair` ring, a missed due day a dashed `warning` ring. Other care done that
 * day adds small icons (scissors, palette, flask) beside it. Empty days keep the 12 pt space.
 */
export function HairDayMarkView({ mark, testID }: { mark?: HairDayMark; testID?: string }) {
  const wash = washMarkOf(mark);
  const icons = (mark?.otherCare ?? [])
    .map((k) => hairTaskIcon('other', k))
    .filter((i): i is IconName => i !== null)
    .slice(0, MAX_ICONS);
  const plainOther = (mark?.otherCare ?? []).includes('other');
  return (
    <View testID={testID} className="h-[12px] flex-row items-center gap-0.5">
      {wash !== 'none' ? (
        <View
          testID={testID ? `${testID}-${wash}` : undefined}
          className={cn(
            'h-[12px] w-[12px] rounded-full',
            wash === 'done' && 'bg-hair',
            wash === 'late' && 'border-2 border-warning bg-hair',
            wash === 'due' && 'border-2 border-hair',
            wash === 'overdue' && 'border-2 border-dashed border-warning',
          )}
        />
      ) : null}
      {icons.map((name) => (
        <Icon key={name} name={name} size={12} tone="hair" strokeWidth={2.5} />
      ))}
      {/* Plain other care has no glyph: a small hair dot says something was done. */}
      {plainOther && icons.length < MAX_ICONS ? (
        <View className="h-[6px] w-[6px] rounded-full bg-hair" />
      ) : null}
    </View>
  );
}

/** C1 Hair view: the hair streak card (washes only), the month with wash and other-care marks. */
export function HairMonthView({
  month,
  onMonthChange,
  selectedDay,
  onDayPress,
}: CalendarMonthProps) {
  const { t } = useTranslation();
  const today = useSelector(appStore, (s) => s.activeDay);
  const marks = useHairMonth(month).data;
  const streak = useHairStreak().data;
  const hasWash = useHasWashTask().data;
  const hasTask = useHasHairTask().data;

  const renderMark = useCallback(
    (day: string) => <HairDayMarkView mark={marks?.[day]} testID={`hair-mark-${day}`} />,
    [marks],
  );
  const label = useCallback(
    (day: string) => hairDayLabel(t, day, today, marks?.[day]),
    [t, today, marks],
  );

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 16 }}
    >
      {hasWash === false ? null : (
        <View className="flex-row gap-3">
          {streak && hasWash ? (
            <StreakCard
              area="hair"
              value={streak.current}
              best={streak.best}
              restarted={streak.best > streak.current}
            />
          ) : (
            <View className="flex-1">
              <Skeleton height={116} radius={16} />
            </View>
          )}
        </View>
      )}

      <Card className="p-3">
        <MonthGrid
          month={month}
          today={today}
          selectedDay={selectedDay}
          onMonthChange={onMonthChange}
          onDayPress={onDayPress}
          renderMark={renderMark}
          dayLabel={label}
        />
      </Card>

      {hasTask === false ? (
        <View className="items-center gap-1 px-6">
          <Text accessibilityRole="header" className="text-center text-title-s">
            {t('hair.list.emptyTitle')}
          </Text>
          <Text className="text-center text-body text-ink-muted">{t('hair.list.emptyBody')}</Text>
        </View>
      ) : null}

      <ProgressPhotosRow />
    </ScrollView>
  );
}

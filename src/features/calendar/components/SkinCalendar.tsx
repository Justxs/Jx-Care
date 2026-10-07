import { useSelector } from '@tanstack/react-store';
import { useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StreakCard } from '@/components/ui/streak';
import { Text } from '@/components/ui/text';
import { appStore } from '@/state/app';

import { useSkinMonth, useSkinStreakCard } from '../api';
import { dayCellLabel } from '../labels';
import { DayMark } from './DayMark';
import { MonthGrid } from './MonthGrid';
import { ProgressPhotosRow } from './ProgressPhotosRow';

export type CalendarMonthProps = {
  month: string;
  onMonthChange: (month: string) => void;
  selectedDay: string | null;
  onDayPress: (day: string) => void;
};

/** C1 Skin view: the skin streak card, the month with a mark per day, and the photos row. */
export function SkinCalendar({
  month,
  onMonthChange,
  selectedDay,
  onDayPress,
}: CalendarMonthProps) {
  const { t } = useTranslation();
  const today = useSelector(appStore, (s) => s.activeDay);
  const { data } = useSkinMonth(month);
  const streak = useSkinStreakCard();
  const statuses = data?.statuses;
  const empty = data ? !data.hasRoutines : false;

  const renderMark = useCallback(
    (day: string) => <DayMark status={statuses?.[day]} testID={`mark-${day}`} />,
    [statuses],
  );
  const dayLabel = useCallback(
    (day: string) => dayCellLabel(t, day, today, statuses?.[day]),
    [t, today, statuses],
  );

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 16 }}
    >
      {empty ? null : (
        <View className="flex-row gap-3">
          {streak ? (
            <StreakCard
              area="skin"
              value={streak.current}
              best={streak.best}
              restarted={streak.restarted}
            />
          ) : (
            <View className="flex-1">
              <Skeleton height={116} radius={16} />
            </View>
          )}
          {/* Task 033: the hair StreakCard goes beside it in the Hair view. */}
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
          dayLabel={dayLabel}
        />
      </Card>

      {empty ? (
        <View className="items-center gap-1 px-6">
          <Text accessibilityRole="header" className="text-center text-title-s">
            {t('calendar.empty.title')}
          </Text>
          <Text className="text-center text-body text-ink-muted">{t('calendar.empty.body')}</Text>
        </View>
      ) : null}

      <ProgressPhotosRow />
    </ScrollView>
  );
}

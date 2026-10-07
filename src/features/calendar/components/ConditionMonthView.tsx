import { useSelector } from '@tanstack/react-store';
import { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { useConditionMonth } from '@/features/condition/api';
import { ConditionLegend, ConditionMark } from '@/features/condition/components/ConditionTone';
import { conditionDayLabel } from '@/features/condition/labels';
import { appStore } from '@/state/app';

import { MonthGrid } from './MonthGrid';
import { ProgressPhotosRow } from './ProgressPhotosRow';
import type { CalendarMonthProps } from './SkinCalendar';

/**
 * C1 Condition view: the same 6-row month, each logged day with a bar in its main skin state's
 * colour ("+1" when more were logged), the legend under the grid, then the photos row. Spoken
 * labels name every state: "5 October, breakout and oily".
 */
export function ConditionMonthView({
  month,
  onMonthChange,
  selectedDay,
  onDayPress,
}: CalendarMonthProps) {
  const { t } = useTranslation();
  const today = useSelector(appStore, (s) => s.activeDay);
  const states = useConditionMonth(month).data;

  const renderMark = useCallback(
    (day: string) => <ConditionMark states={states?.[day]} testID={`condition-mark-${day}`} />,
    [states],
  );
  const dayLabel = useCallback(
    (day: string) => conditionDayLabel(t, day, today, states?.[day]),
    [t, today, states],
  );

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 16 }}
    >
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
      <ConditionLegend />
      <ProgressPhotosRow />
    </ScrollView>
  );
}

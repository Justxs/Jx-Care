import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LayoutAnimationConfig,
  ReduceMotion,
  SlideInLeft,
  SlideInRight,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';
import { motion } from '@/theme/motion';
import { useMotion } from '@/theme/useMotion';

import { monthTitle } from '../labels';
import { gridDays, monthOf, shiftMonth } from '../month';
import { DayCell } from './DayCell';

/** How far (pt) or how fast (pt/s) a horizontal swipe must go to change the month. */
const SWIPE_DISTANCE = 48;
const SWIPE_VELOCITY = 400;

const enter = Easing.bezier(...motion.easing.enter);
const { Pan: pan } = Gesture;

export type MonthGridProps = {
  /** The month shown, 'YYYY-MM'. */
  month: string;
  today: string;
  selectedDay: string | null;
  onMonthChange: (month: string) => void;
  onDayPress: (day: string) => void;
  /** The view's mark for a day (skin status, hair wash, condition chip). */
  renderMark: (day: string) => ReactNode;
  /** The spoken label for a day, with its status. */
  dayLabel: (day: string) => string;
};

/**
 * C1 month grid: always 6 rows × 7 days, Monday first, so the height never changes. Swipe or
 * the arrows move a month with a 200 ms slide (a 100 ms fade under Reduce Motion); "Today"
 * comes back to the current month and keeps its space while hidden.
 */
export function MonthGrid({
  month,
  today,
  selectedDay,
  onMonthChange,
  onDayPress,
  renderMark,
  dayLabel,
}: MonthGridProps) {
  const { t } = useTranslation();
  const m = useMotion();
  const days = useMemo(() => gridDays(month), [month]);
  const currentMonth = monthOf(today);
  const isCurrent = month === currentMonth;

  // The slide direction follows the last month change (adjusting state while rendering).
  const [shown, setShown] = useState(month);
  const [direction, setDirection] = useState<1 | -1>(1);
  if (shown !== month) {
    setShown(month);
    setDirection(month > shown ? 1 : -1);
  }

  const swipe = useMemo(
    () =>
      pan()
        .runOnJS(true)
        .activeOffsetX([-16, 16])
        .failOffsetY([-12, 12])
        .onEnd((e) => {
          if (e.translationX <= -SWIPE_DISTANCE || e.velocityX <= -SWIPE_VELOCITY) {
            onMonthChange(shiftMonth(month, 1));
          } else if (e.translationX >= SWIPE_DISTANCE || e.velocityX >= SWIPE_VELOCITY) {
            onMonthChange(shiftMonth(month, -1));
          }
        })
        .withTestId('month-swipe'),
    [month, onMonthChange],
  );
  const go = (n: number) => onMonthChange(shiftMonth(month, n));

  const entering = m.reduced
    ? FadeIn.duration(motion.duration.reduced).reduceMotion(ReduceMotion.Never)
    : (direction > 0 ? SlideInRight : SlideInLeft).duration(motion.duration.base).easing(enter);
  const exiting = FadeOut.duration(
    m.reduced ? motion.duration.reduced : motion.duration.fast,
  ).reduceMotion(ReduceMotion.Never);

  const rows = Array.from({ length: 6 }, (_, r) => days.slice(r * 7, r * 7 + 7));

  return (
    <View className="gap-1">
      <View className="min-h-[44px] flex-row items-center gap-1">
        <Text accessibilityRole="header" className="flex-1 pl-1 text-title-s">
          {monthTitle(t, month)}
        </Text>
        <Pressable
          onPress={() => onMonthChange(currentMonth)}
          disabled={isCurrent}
          accessibilityRole="button"
          accessibilityLabel={t('calendar.todayLabel')}
          accessibilityElementsHidden={isCurrent}
          importantForAccessibility={isCurrent ? 'no-hide-descendants' : 'auto'}
          hitSlop={4}
          className={cn(
            'min-h-[44px] min-w-[44px] items-center justify-center px-2 active:opacity-85',
            isCurrent && 'opacity-0',
          )}
        >
          <Text className="text-body-strong text-accent">{t('calendar.today')}</Text>
        </Pressable>
        <Pressable
          onPress={() => go(-1)}
          accessibilityRole="button"
          accessibilityLabel={t('calendar.previousMonth')}
          className="h-[44px] w-[44px] items-center justify-center rounded-full active:opacity-85"
        >
          <Icon name="chevron-left" size={24} tone="ink" />
        </Pressable>
        <Pressable
          onPress={() => go(1)}
          accessibilityRole="button"
          accessibilityLabel={t('calendar.nextMonth')}
          className="h-[44px] w-[44px] items-center justify-center rounded-full active:opacity-85"
        >
          <Icon name="chevron-right" size={24} tone="ink" />
        </Pressable>
      </View>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="flex-row"
      >
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <Text key={d} className="flex-1 text-center text-tiny text-ink-muted">
            {t(`weekdays.letter.${d}`)}
          </Text>
        ))}
      </View>

      <GestureDetector gesture={swipe}>
        <View testID="month-grid" className="h-[312px] overflow-hidden">
          {/* The first month paints in place; later months slide in. */}
          <LayoutAnimationConfig skipEntering>
            <Animated.View
              key={month}
              entering={entering}
              exiting={exiting}
              className="absolute inset-0"
            >
              {rows.map((row) => (
                <View key={row[0]} className="flex-row">
                  {row.map((day) => (
                    <DayCell
                      key={day}
                      day={day}
                      inMonth={monthOf(day) === month}
                      isToday={day === today}
                      selected={day === selectedDay}
                      mark={renderMark(day)}
                      accessibilityLabel={dayLabel(day)}
                      onPress={onDayPress}
                    />
                  ))}
                </View>
              ))}
            </Animated.View>
          </LayoutAnimationConfig>
        </View>
      </GestureDetector>
    </View>
  );
}

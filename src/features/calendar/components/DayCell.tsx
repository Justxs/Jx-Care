import { memo, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';

/** Every cell is 52 pt tall (`h-[52px]`), so 6 rows always make a 312 pt grid. */

export type DayCellProps = {
  day: string;
  /** Days outside the shown month are drawn in `ink-muted`. */
  inMonth: boolean;
  isToday: boolean;
  selected: boolean;
  /** The view's 12 pt mark (skin status, hair wash, condition chip). */
  mark: ReactNode;
  /** Date and status, read by screen readers ("5 October, partly done"). */
  accessibilityLabel: string;
  onPress: (day: string) => void;
};

/**
 * One grid day: the number with its mark below. Today has an accent outline; the selected day a
 * soft accent background with ink text, never the solid "done" colour.
 */
export const DayCell = memo(function DayCell({
  day,
  inMonth,
  isToday,
  selected,
  mark,
  accessibilityLabel,
  onPress,
}: DayCellProps) {
  return (
    <Pressable
      testID={`day-${day}`}
      onPress={() => onPress(day)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      className="h-[52px] flex-1 p-0.5 active:opacity-85"
    >
      <View
        testID={`cell-${day}`}
        className={cn(
          'flex-1 items-center justify-center gap-1 rounded-md border-2',
          isToday ? 'border-accent' : 'border-transparent',
          selected && 'bg-accent-soft',
        )}
      >
        <Text
          className={cn(
            'text-body tabular-nums',
            selected || inMonth ? 'text-ink' : 'text-ink-muted',
            isToday && 'text-body-strong',
          )}
        >
          {Number(day.slice(8))}
        </Text>
        {mark}
      </View>
    </Pressable>
  );
});

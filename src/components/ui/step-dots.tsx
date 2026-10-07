import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { useMotion } from '@/theme/useMotion';

function Dot({ active, done }: { active: boolean; done: boolean }) {
  const m = useMotion();
  const width = useSharedValue(active ? 24 : 8);
  useEffect(() => {
    width.set(withTiming(active ? 24 : 8, m.timing('base')));
  }, [active, m, width]);
  const style = useAnimatedStyle(() => ({ width: width.value }));
  return (
    <Animated.View
      style={style}
      className={cn('h-[8px] rounded-full', active || done ? 'bg-accent' : 'bg-border-strong')}
    />
  );
}

export type StepDotsProps = {
  count: number;
  /** Zero-based current step. */
  index: number;
  className?: string;
};

/** Onboarding progress; the current dot widens. Fixed-height row so nothing below moves. */
export function StepDots({ count, index, className }: StepDotsProps) {
  const { t } = useTranslation();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('common.stepOf', { index: index + 1, count })}
      accessibilityValue={{ min: 1, max: count, now: index + 1 }}
      className={cn('h-[16px] flex-row items-center justify-center gap-2', className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} active={i === index} done={i < index} />
      ))}
    </View>
  );
}

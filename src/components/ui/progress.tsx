import * as ProgressPrimitive from '@rn-primitives/progress';
import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { useMotion } from '@/theme/useMotion';

export type ProgressProps = {
  value: number;
  max?: number;
  accessibilityLabel?: string;
  className?: string;
};

const ratioOf = (value: number, max: number) =>
  max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

/** 6 pt bar. The fill grows with scaleX from the left, never width, so nothing relayouts. */
export function Progress({ value, max = 100, accessibilityLabel, className }: ProgressProps) {
  const { t } = useTranslation();
  const m = useMotion();
  const ratio = ratioOf(value, max);
  const scale = useSharedValue(ratio);
  useEffect(() => {
    scale.set(withTiming(ratio, m.timing('base')));
  }, [ratio, m, scale]);
  const fill = useAnimatedStyle(() => ({
    transformOrigin: 'left',
    transform: [{ scaleX: scale.value }],
  }));
  return (
    <ProgressPrimitive.Root
      value={value}
      max={max}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? t('a11y.progress', { value, max })}
      accessibilityValue={{ min: 0, max, now: value }}
      className={cn('h-[6px] w-full overflow-hidden rounded-full bg-subtle', className)}
    >
      <Animated.View style={fill} className="h-full w-full rounded-full bg-accent" />
    </ProgressPrimitive.Root>
  );
}

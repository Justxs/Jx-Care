import { useEffect } from 'react';
import type { DimensionValue } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { cn } from '@/lib/cn';
import { useMotion } from '@/theme/useMotion';

export type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  className?: string;
};

/** A placeholder at the exact size of what replaces it; pulses unless Reduce Motion is on. */
export function Skeleton({ width = '100%', height = 16, radius = 8, className }: SkeletonProps) {
  const m = useMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (m.reduced) {
      cancelAnimation(opacity);
      opacity.set(1);
      return;
    }
    opacity.set(withRepeat(withTiming(0.5, { duration: 800 }), -1, true));
    return () => cancelAnimation(opacity);
  }, [m.reduced, opacity]);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius }, pulse]}
      className={cn('bg-subtle', className)}
    />
  );
}

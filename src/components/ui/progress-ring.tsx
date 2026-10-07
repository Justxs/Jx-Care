import { useEffect } from 'react';
import { View } from 'react-native';
import {
  createAnimatedComponent,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { useThemeColors } from '@/theme/colors';
import { useMotion } from '@/theme/useMotion';

import { Text } from './text';

const AnimatedCircle = createAnimatedComponent(Circle);

export type ProgressRingProps = {
  value: number;
  max?: number;
  size?: number;
  /** Shown in the middle; defaults to "value/max". */
  label?: string;
  accessibilityLabel?: string;
};

/** Fixed-size ring; the arc animates with strokeDashoffset and turns `ok` when complete. */
export function ProgressRing({
  value,
  max = 1,
  size = 44,
  label,
  accessibilityLabel,
}: ProgressRingProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const m = useMotion();
  const stroke = size >= 64 ? 6 : 4;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const complete = max > 0 && value >= max;
  const offset = useSharedValue(circumference * (1 - ratio));
  useEffect(() => {
    offset.set(withTiming(circumference * (1 - ratio), m.timing('base')));
  }, [ratio, circumference, m, offset]);
  const arc = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? t('a11y.progress', { value, max })}
      accessibilityValue={{ min: 0, max, now: value }}
      style={{ width: size, height: size }}
      className="items-center justify-center"
    >
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.subtle}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={complete ? colors.ok : colors.accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={arc}
          fill="none"
        />
      </Svg>
      <Text
        className={cn(
          size >= 64 ? 'text-body-strong' : 'text-tiny',
          'tabular-nums',
          complete ? 'text-ok' : 'text-ink',
        )}
      >
        {label ?? `${value}/${max}`}
      </Text>
    </View>
  );
}

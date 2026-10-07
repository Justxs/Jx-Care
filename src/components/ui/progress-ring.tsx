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
};

const SIZE = 44;
const STROKE = 4;

/** 44 pt ring showing "value/max"; the arc animates with strokeDashoffset and turns `ok` when complete. */
export function ProgressRing({ value, max = 1 }: ProgressRingProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const m = useMotion();
  const r = (SIZE - STROKE) / 2;
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
      accessibilityLabel={t('a11y.progress', { value, max })}
      accessibilityValue={{ min: 0, max, now: value }}
      style={{ width: SIZE, height: SIZE }}
      className="items-center justify-center"
    >
      <Svg
        width={SIZE}
        height={SIZE}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={r}
          stroke={colors.subtle}
          strokeWidth={STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={r}
          stroke={complete ? colors.ok : colors.accent}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={arc}
          fill="none"
        />
      </Svg>
      <Text className={cn('text-tiny tabular-nums', complete ? 'text-ok' : 'text-ink')}>
        {`${value}/${max}`}
      </Text>
    </View>
  );
}

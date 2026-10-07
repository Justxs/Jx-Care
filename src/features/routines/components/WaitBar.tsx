import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { formatCountdown } from '@/i18n/format';
import { motion } from '@/theme/motion';
import { useMotion } from '@/theme/useMotion';

export type WaitBarProps = {
  /** Whole seconds left. */
  remaining: number;
  onSkip: () => void;
  /** The bar's full height, so toasts can float above it. */
  onHeight?: (height: number) => void;
};

/**
 * The wait between steps (T2): a fixed bar floating at the bottom of the player with the
 * countdown and a real Skip wait button. It never pushes the list.
 */
export function WaitBar({ remaining, onSkip, onHeight }: WaitBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const m = useMotion();
  const enter = m.allowMovement ? FadeInDown : FadeIn;
  const exit = m.allowMovement ? FadeOutDown : FadeOut;
  return (
    <Animated.View
      testID="wait-bar"
      entering={enter.duration(m.reduced ? motion.duration.reduced : motion.duration.base)}
      exiting={exit.duration(m.reduced ? motion.duration.reduced : motion.duration.fast)}
      onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
      className="absolute inset-x-0 bottom-0 border-t border-border bg-surface px-4 pt-3 shadow-raised"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <View className="flex-row items-center gap-3">
        <Icon name="timer" size={24} tone="ink-muted" />
        <Text className="flex-1 text-body-strong tabular-nums">
          {t('player.wait', { time: formatCountdown(remaining) })}
        </Text>
        <Button
          variant="secondary"
          size="sm"
          block={false}
          className="min-h-[44px]"
          onPress={onSkip}
        >
          {t('player.skipWait')}
        </Button>
      </View>
    </Animated.View>
  );
}

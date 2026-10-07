import * as Haptics from 'expo-haptics';
import { useImperativeHandle, type Ref } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { useMotion } from '@/theme/useMotion';

import { Icon } from './icon';
import { Text } from './text';

export const PIN_LENGTH = 4;

export type PinPadHandle = {
  /** 300 ms shake (a fade with Reduce Motion) plus an error haptic, for a wrong PIN. */
  shake: () => void;
};

export type PinPadProps = {
  /** Digits typed so far, 0–4. Digits themselves are never shown. */
  filled: number;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  /** Shows the Face ID / fingerprint key bottom left. */
  biometric?: boolean;
  onBiometric?: () => void;
  /** Keys off; `message` says why. */
  disabled?: boolean;
  /** Reserved line under the dots: an error or the lockout reason. */
  message?: string;
  ref?: Ref<PinPadHandle>;
};

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

function Key({
  label,
  onPress,
  disabled,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      className={cn(
        'h-[76px] w-[76px] items-center justify-center rounded-full bg-surface shadow-card active:opacity-85 dark:border dark:border-border dark:shadow-none',
        disabled && 'opacity-45',
      )}
    >
      {children}
    </Pressable>
  );
}

/** Four PIN dots and the number keypad. */
export function PinPad({
  filled,
  onDigit,
  onDelete,
  biometric,
  onBiometric,
  disabled,
  message,
  ref,
}: PinPadProps) {
  const { t } = useTranslation();
  const m = useMotion();
  const x = useSharedValue(0);
  const fade = useSharedValue(1);

  useImperativeHandle(
    ref,
    () => ({
      shake: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        if (m.reduced) {
          fade.set(
            withSequence(withTiming(0.3, { duration: 50 }), withTiming(1, { duration: 50 })),
          );
          return;
        }
        const step = { duration: 50 };
        x.set(
          withSequence(
            withTiming(-10, step),
            withTiming(10, step),
            withTiming(-8, step),
            withTiming(8, step),
            withTiming(-4, step),
            withTiming(0, step),
          ),
        );
      },
    }),
    [fade, m.reduced, x],
  );

  const dotsStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateX: x.value }],
  }));

  return (
    <View className="items-center gap-8">
      <View className="items-center gap-3">
        <Animated.View
          style={dotsStyle}
          accessible
          accessibilityLabel={t('a11y.pinEntered', { count: filled })}
          className="flex-row gap-4"
        >
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <View
              key={i}
              className={cn(
                'h-[16px] w-[16px] rounded-full border-2',
                i < filled ? 'border-accent bg-accent' : 'border-border-strong',
              )}
            />
          ))}
        </Animated.View>
        {/* Reserved so a message never pushes the keypad down. */}
        <View className="min-h-[36px] justify-center px-4">
          {message ? (
            <Text accessibilityLiveRegion="polite" className="text-center text-caption text-danger">
              {message}
            </Text>
          ) : null}
        </View>
      </View>
      <View className="gap-4">
        {ROWS.map((row) => (
          <View key={row[0]} className="flex-row gap-6">
            {row.map((d) => (
              <Key key={d} label={d} disabled={disabled} onPress={() => onDigit(d)}>
                <Text className="text-title-l tabular-nums">{d}</Text>
              </Key>
            ))}
          </View>
        ))}
        <View className="flex-row gap-6">
          {biometric && onBiometric ? (
            <Key label={t('a11y.unlockWithBiometrics')} disabled={disabled} onPress={onBiometric}>
              <Icon name="fingerprint" size={28} tone="accent" />
            </Key>
          ) : (
            <View className="h-[76px] w-[76px]" />
          )}
          <Key label="0" disabled={disabled} onPress={() => onDigit('0')}>
            <Text className="text-title-l tabular-nums">0</Text>
          </Key>
          <Key
            label={t('a11y.deleteLastDigit')}
            disabled={disabled || filled === 0}
            onPress={onDelete}
          >
            <Icon name="delete" size={26} tone="ink" />
          </Key>
        </View>
      </View>
    </View>
  );
}

import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/ui/icon';
import { StepDots } from '@/components/ui/step-dots';

export const ONBOARDING_STEPS = 5;

export type OnboardingFrameProps = {
  /** Zero-based step: O1 is 0, O5 is 4. */
  step: number;
  /** Back arrow on every step after the first; defaults to going back one screen. */
  onBack?: () => void;
  /** Pinned under the body (the step's buttons); rides above the keyboard. */
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Shared frame for O1–O5: a fixed-height top row with Back on the left and the step dots in the
 * middle, then the step inside the `space-6` gutter, then the pinned buttons.
 */
export function OnboardingFrame({ step, onBack, footer, children }: OnboardingFrameProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const back = step > 0 ? (onBack ?? (() => router.back())) : undefined;
  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-canvas">
      <View className="h-[56px] flex-row items-center px-2">
        {back ? (
          <Pressable
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.back')}
            className="h-[44px] w-[44px] items-center justify-center rounded-full active:opacity-85"
          >
            <Icon name="arrow-left" size={24} tone="ink" />
          </Pressable>
        ) : (
          <View className="w-[44px]" />
        )}
        <View className="flex-1 items-center">
          <StepDots count={ONBOARDING_STEPS} index={step} />
        </View>
        <View className="w-[44px]" />
      </View>
      <View className="flex-1">{children}</View>
      {footer ? (
        <KeyboardStickyView offset={{ opened: insets.bottom }}>
          <View className="gap-2 bg-canvas px-6 pb-4 pt-3">{footer}</View>
        </KeyboardStickyView>
      ) : null}
    </SafeAreaView>
  );
}

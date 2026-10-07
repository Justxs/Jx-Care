import * as CheckboxPrimitive from '@rn-primitives/checkbox';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { cn } from '@/lib/cn';
import { motion } from '@/theme/motion';

import { Icon } from './icon';

export type CheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  className?: string;
};

/** Square tick (7 px corners, so it never reads as a radio); a light haptic when ticked. */
export function Checkbox({
  checked,
  onCheckedChange,
  accessibilityLabel,
  disabled,
  className,
}: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      disabled={disabled}
      onCheckedChange={(next) => {
        if (next) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onCheckedChange(next);
      }}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, disabled: !!disabled }}
      hitSlop={9}
      className={cn(
        'h-[26px] w-[26px] items-center justify-center rounded-[7px] border-2',
        checked ? 'border-accent bg-accent' : 'border-border-strong bg-surface',
        disabled && 'opacity-45',
        className,
      )}
    >
      <CheckboxPrimitive.Indicator asChild>
        <Animated.View
          entering={FadeIn.duration(motion.duration.fast)}
          exiting={FadeOut.duration(motion.duration.fast)}
        >
          <Icon name="check" size={18} tone="on-accent" strokeWidth={3} />
        </Animated.View>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

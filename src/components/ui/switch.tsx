import * as SwitchPrimitive from '@rn-primitives/switch';
import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { cn } from '@/lib/cn';
import { useMotion } from '@/theme/useMotion';

export type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  accessibilityLabel?: string;
  disabled?: boolean;
};

/** On/off; the thumb slides in 150 ms. Changes apply at once. */
export function Switch({ checked, onCheckedChange, accessibilityLabel, disabled }: SwitchProps) {
  const m = useMotion();
  const x = useSharedValue(checked ? 20 : 0);
  useEffect(() => {
    x.set(withTiming(checked ? 20 : 0, m.timing('fast')));
  }, [checked, m, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, disabled: !!disabled }}
      hitSlop={10}
      className={cn(
        'h-[28px] w-[48px] justify-center rounded-full px-[2px]',
        checked ? 'bg-accent' : 'bg-border-strong',
        disabled && 'opacity-45',
      )}
    >
      <Animated.View style={thumb}>
        <SwitchPrimitive.Thumb className="h-[24px] w-[24px] rounded-full bg-surface shadow-card" />
      </Animated.View>
    </SwitchPrimitive.Root>
  );
}

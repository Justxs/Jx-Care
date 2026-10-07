import { useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';

import { useMotion } from '@/theme/useMotion';

export type CollapsibleProps = {
  open: boolean;
  children: ReactNode;
};

/** Animates its own height open and closed (200 ms) for late sections, so the rest glides. */
export function Collapsible({ open, children }: CollapsibleProps) {
  const m = useMotion();
  const [height, setHeight] = useState(0);
  const config = m.timing('base');
  const progress = useDerivedValue(() => withTiming(open ? 1 : 0, config), [open, config]);
  const style = useAnimatedStyle(() => ({
    height: height * progress.value,
    opacity: progress.value,
  }));
  const onLayout = (e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height);
  return (
    <Animated.View
      style={style}
      className="overflow-hidden"
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
    >
      {/* Measured off-flow so the section knows its full height before it opens. */}
      <View onLayout={onLayout} className="absolute left-0 right-0 top-0">
        {children}
      </View>
    </Animated.View>
  );
}

import * as ToggleGroupPrimitive from '@rn-primitives/toggle-group';
import { useEffect, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { cn } from '@/lib/cn';
import { useMotion } from '@/theme/useMotion';

import { Icon, type IconName } from './icon';
import { Text } from './text';

export type ToggleGroupItem = { value: string; label: string; icon?: IconName; count?: number };

export type ToggleGroupProps = {
  items: readonly ToggleGroupItem[];
  value: string;
  onValueChange: (value: string) => void;
  size?: 'md' | 'sm';
  accessibilityLabel?: string;
  className?: string;
};

/** Segmented single choice with a sliding `surface` indicator behind the selected item. */
export function ToggleGroup({
  items,
  value,
  onValueChange,
  size = 'md',
  accessibilityLabel,
  className,
}: ToggleGroupProps) {
  const m = useMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    items.findIndex((i) => i.value === value),
  );
  const itemWidth = items.length > 0 ? width / items.length : 0;
  const x = useSharedValue(0);

  // Slide to the selected item; the first layout places it without a slide (see onLayout).
  useEffect(() => {
    if (itemWidth > 0) x.set(withTiming(index * itemWidth, m.timing('base')));
  }, [index, itemWidth, m, x]);

  const onLayout = (e: LayoutChangeEvent) => {
    const inner = e.nativeEvent.layout.width - 8;
    if (width === 0 && items.length > 0) x.set((index * inner) / items.length);
    setWidth(inner);
  };

  const indicator = useAnimatedStyle(() => ({
    width: itemWidth,
    transform: [{ translateX: x.value }],
  }));

  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      onValueChange={(next) => {
        // Single choice never goes empty: tapping the selected item keeps it.
        if (next) onValueChange(next);
      }}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      onLayout={onLayout}
      className={cn(
        'flex-row rounded-md bg-subtle p-1',
        size === 'md' ? 'h-[42px]' : 'h-[32px] self-start',
        className,
      )}
    >
      {width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={indicator}
          className="absolute bottom-1 left-1 top-1 rounded-sm bg-surface shadow-card dark:shadow-none dark:border dark:border-border"
        />
      ) : null}
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <ToggleGroupPrimitive.Item
            key={item.value}
            value={item.value}
            accessibilityRole="radio"
            accessibilityLabel={
              item.count !== undefined ? `${item.label}, ${item.count}` : item.label
            }
            accessibilityState={{ checked: selected, selected }}
            hitSlop={size === 'sm' ? 6 : undefined}
            className={cn(
              'flex-1 flex-row items-center justify-center gap-1.5 rounded-sm',
              size === 'sm' ? 'px-3' : 'px-2',
              !width && selected && 'bg-surface',
            )}
          >
            {item.icon ? (
              <Icon name={item.icon} size={16} tone={selected ? 'ink' : 'ink-muted'} />
            ) : null}
            <Text
              numberOfLines={1}
              className={cn('text-label', selected ? 'text-ink' : 'text-ink-muted')}
            >
              {item.label}
            </Text>
            {item.count !== undefined ? (
              <View className="min-w-[20px] items-center rounded-full bg-accent px-1.5">
                <Text className="text-tiny tabular-nums text-on-accent">{item.count}</Text>
              </View>
            ) : null}
          </ToggleGroupPrimitive.Item>
        );
      })}
    </ToggleGroupPrimitive.Root>
  );
}

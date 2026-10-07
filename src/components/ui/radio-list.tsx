import * as RadioGroupPrimitive from '@rn-primitives/radio-group';
import { Fragment, type ReactNode } from 'react';
import { View } from 'react-native';

import { cn } from '@/lib/cn';

import { Separator } from './separator';
import { Text } from './text';

export type RadioListItem = { value: string; label: string; detail?: string; lead?: ReactNode };

export type RadioListProps = {
  items: readonly RadioListItem[];
  value: string | undefined;
  onValueChange: (value: string) => void;
  accessibilityLabel?: string;
  className?: string;
};

/** A vertical single choice: one 56 pt row per option, a round mark on the right. */
export function RadioList({
  items,
  value,
  onValueChange,
  accessibilityLabel,
  className,
}: RadioListProps) {
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      className={cn(
        'overflow-hidden rounded-xl bg-surface shadow-card dark:border dark:border-border dark:shadow-none',
        className,
      )}
    >
      {items.map((item, i) => {
        const selected = item.value === value;
        return (
          <Fragment key={item.value}>
            {i > 0 ? <Separator className="ml-4" /> : null}
            <RadioGroupPrimitive.Item
              value={item.value}
              accessibilityRole="radio"
              accessibilityLabel={item.detail ? `${item.label}. ${item.detail}` : item.label}
              accessibilityState={{ checked: selected, selected }}
              className={cn(
                'min-h-[56px] flex-row items-center gap-3 px-4 py-3 active:bg-accent-soft',
                selected && 'bg-accent-soft',
              )}
            >
              {item.lead}
              <View className="flex-1 gap-0.5">
                <Text className={selected ? 'text-body-strong text-accent' : 'text-body'}>
                  {item.label}
                </Text>
                {item.detail ? (
                  <Text className="text-caption text-ink-muted">{item.detail}</Text>
                ) : null}
              </View>
              <View
                className={cn(
                  'h-[22px] w-[22px] items-center justify-center rounded-full border-2',
                  selected ? 'border-accent' : 'border-border-strong',
                )}
              >
                <RadioGroupPrimitive.Indicator className="h-[10px] w-[10px] rounded-full bg-accent" />
              </View>
            </RadioGroupPrimitive.Item>
          </Fragment>
        );
      })}
    </RadioGroupPrimitive.Root>
  );
}

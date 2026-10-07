import * as TogglePrimitive from '@rn-primitives/toggle';
import { View } from 'react-native';

import { cn } from '@/lib/cn';

import { Icon, type IconName } from './icon';
import { Text } from './text';

export type ChipProps = {
  selected?: boolean;
  onPressedChange?: (selected: boolean) => void;
  icon?: IconName;
  count?: number;
  tone?: 'danger';
  children: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  className?: string;
};

/** 36 pt pill for filters, tags and quick picks. */
export function Chip({
  selected = false,
  onPressedChange,
  icon,
  count,
  tone,
  children,
  accessibilityLabel,
  disabled,
  className,
}: ChipProps) {
  const danger = tone === 'danger';
  const textTone = selected ? (danger ? 'text-danger' : 'text-accent') : 'text-ink';
  return (
    <TogglePrimitive.Root
      pressed={selected}
      onPressedChange={(p) => onPressedChange?.(p)}
      disabled={disabled}
      // A filter chip reads as a selected button, not the primitive's switch.
      role="button"
      aria-checked={undefined}
      accessibilityLabel={accessibilityLabel ?? children}
      accessibilityState={{ selected, disabled: !!disabled }}
      hitSlop={4}
      className={cn(
        'min-h-[36px] flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 active:opacity-85',
        selected
          ? danger
            ? 'border-danger bg-danger-soft'
            : 'border-accent bg-accent-soft'
          : 'border-border-strong bg-surface',
        disabled && 'opacity-45',
        className,
      )}
    >
      {icon ? (
        <Icon
          name={icon}
          size={16}
          tone={selected ? (danger ? 'danger' : 'accent') : 'ink-muted'}
        />
      ) : null}
      <Text className={cn('text-label', textTone)}>{children}</Text>
      {count !== undefined ? (
        <Text className={cn('text-label tabular-nums', selected ? textTone : 'text-ink-muted')}>
          {count}
        </Text>
      ) : null}
    </TogglePrimitive.Root>
  );
}

export type ChipGroupItem = { value: string; label: string; icon?: IconName; count?: number };

export type ChipGroupProps = {
  items: readonly ChipGroupItem[];
  value: readonly string[];
  onValueChange: (value: string[]) => void;
  /** Single choice: tapping the selected chip keeps it (unless `allowEmpty`). */
  single?: boolean;
  allowEmpty?: boolean;
  tone?: 'danger';
  accessibilityLabel?: string;
  className?: string;
};

/** A wrapping set of chips; multiple choice by default. */
export function ChipGroup({
  items,
  value,
  onValueChange,
  single,
  allowEmpty = true,
  tone,
  accessibilityLabel,
  className,
}: ChipGroupProps) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={single ? 'radiogroup' : undefined}
      className={cn('flex-row flex-wrap gap-2', className)}
    >
      {items.map((item) => {
        const selected = value.includes(item.value);
        return (
          <Chip
            key={item.value}
            selected={selected}
            icon={item.icon}
            count={item.count}
            tone={tone}
            onPressedChange={() => {
              if (single) {
                if (selected && allowEmpty) onValueChange([]);
                else if (!selected) onValueChange([item.value]);
                return;
              }
              onValueChange(
                selected ? value.filter((v) => v !== item.value) : [...value, item.value],
              );
            }}
          >
            {item.label}
          </Chip>
        );
      })}
    </View>
  );
}

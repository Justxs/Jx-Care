import type { Ref } from 'react';
import { Pressable, type PressableInstance, type PressableProps } from 'react-native';

import { cn } from '@/lib/cn';

import { fieldBoxClass } from './field';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export type FieldButtonProps = Omit<PressableProps, 'children'> & {
  ref?: Ref<PressableInstance>;
  /** Shown value; the placeholder shows when empty. */
  value?: string;
  placeholder?: string;
  invalid?: boolean;
  icon?: IconName;
  label?: string;
  /** Lines the value may wrap to before it is cut off (long recovery questions). */
  valueLines?: number;
};

/** The 48 pt trigger that select, date and time fields share; looks like an Input. */
export function FieldButton({
  ref,
  value,
  placeholder,
  invalid,
  icon = 'chevron-down',
  label,
  valueLines = 1,
  disabled,
  className,
  ...props
}: FieldButtonProps) {
  return (
    <Pressable
      ref={ref}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label ? `${label}, ${value || placeholder || ''}` : value}
      accessibilityState={{ disabled: !!disabled }}
      className={cn(
        fieldBoxClass({ invalid, disabled: !!disabled }),
        'gap-2 active:opacity-85',
        typeof className === 'string' ? className : undefined,
      )}
      {...props}
    >
      <Text
        numberOfLines={valueLines}
        className={cn('flex-1 py-2 text-body', value ? 'text-ink' : 'text-ink-muted')}
      >
        {value || placeholder}
      </Text>
      <Icon name={icon} size={20} tone="ink-muted" />
    </Pressable>
  );
}

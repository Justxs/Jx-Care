import type { ReactNode } from 'react';
import { Pressable, View, type PressableProps } from 'react-native';

import { cn } from '@/lib/cn';
import type { ColorToken } from '@/theme/colors';

import { Icon, type IconName } from './icon';
import { Text, TextClassContext } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  icon?: IconName;
  /** Full width (default) or as wide as the label. */
  block?: boolean;
  /** Busy: not pressable, label kept so the width never changes. */
  loading?: boolean;
  children: ReactNode;
  className?: string;
};

const container: Record<ButtonVariant, string> = {
  primary: 'bg-accent',
  secondary: 'bg-surface border border-border-strong',
  ghost: 'bg-transparent',
  danger: 'bg-danger-soft',
};

const label: Record<ButtonVariant, string> = {
  primary: 'text-on-accent',
  secondary: 'text-accent',
  ghost: 'text-accent',
  danger: 'text-danger',
};

const iconTone: Record<ButtonVariant, ColorToken> = {
  primary: 'on-accent',
  secondary: 'accent',
  ghost: 'accent',
  danger: 'danger',
};

/** The action button: verb-first label, 52 pt, one primary per screen. */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  block = true,
  disabled,
  loading,
  children,
  className,
  accessibilityState,
  ...props
}: ButtonProps) {
  const inactive = !!disabled || !!loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading, ...accessibilityState }}
      disabled={inactive}
      hitSlop={size === 'sm' ? 4 : undefined}
      className={cn(
        'flex-row items-center justify-center gap-2 rounded-md active:opacity-85',
        size === 'md' ? 'min-h-[52px] px-5 py-3' : 'min-h-[40px] px-4 py-2',
        block ? 'self-stretch' : 'self-start',
        container[variant],
        disabled && 'opacity-45',
        className,
      )}
      {...props}
    >
      {icon ? <Icon name={icon} size={size === 'md' ? 20 : 18} tone={iconTone[variant]} /> : null}
      <TextClassContext.Provider value={cn('text-body-strong text-center', label[variant])}>
        {typeof children === 'string' ? <Text>{children}</Text> : <View>{children}</View>}
      </TextClassContext.Provider>
    </Pressable>
  );
}

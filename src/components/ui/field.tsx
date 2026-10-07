import * as LabelPrimitive from '@rn-primitives/label';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { cn } from '@/lib/cn';

import { Text } from './text';

export type FieldProps = {
  label?: string;
  /** Shown in the reserved line when there is no error. */
  hint?: string;
  /** Replaces the hint in the same line, in `danger`. */
  error?: string;
  /** Drop the reserved line (only for fields that can never show a hint or error). */
  noHelper?: boolean;
  /** Links the label to its control for screen readers. */
  nativeID?: string;
  onLabelPress?: () => void;
  children: ReactNode;
  className?: string;
};

/** Label above, the control, and one reserved line under it for the hint or the error. */
export function Field({
  label,
  hint,
  error,
  noHelper,
  nativeID,
  onLabelPress,
  children,
  className,
}: FieldProps) {
  return (
    <View className={cn('gap-1.5', className)}>
      {label ? (
        <LabelPrimitive.Root onPress={onLabelPress}>
          <LabelPrimitive.Text nativeID={nativeID} className="text-label text-ink">
            {label}
          </LabelPrimitive.Text>
        </LabelPrimitive.Root>
      ) : null}
      {children}
      {noHelper ? null : (
        // Always rendered at one caption line so an error never moves the fields below.
        <View testID="field-helper" className="min-h-[18px]">
          {error ? (
            <Text accessibilityLiveRegion="polite" className="text-caption text-danger">
              {error}
            </Text>
          ) : hint ? (
            <Text className="text-caption text-ink-muted">{hint}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

/** The 48 pt box that inputs and select fields share, so mixed rows line up. */
export function fieldBoxClass(opts: { invalid?: boolean; disabled?: boolean; focused?: boolean }) {
  return cn(
    'min-h-[48px] flex-row items-center rounded-md border bg-surface px-3',
    opts.invalid ? 'border-danger' : opts.focused ? 'border-accent' : 'border-border-strong',
    opts.disabled && 'opacity-45',
  );
}

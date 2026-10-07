import * as SelectPrimitive from '@rn-primitives/select';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { cn } from '@/lib/cn';
import { motion } from '@/theme/motion';

import { Field, fieldBoxClass } from './field';
import { FieldButton } from './field-button';
import { Icon } from './icon';
import { RadioList } from './radio-list';
import { Sheet } from './sheet';
import { Text } from './text';

export type SelectOption = { value: string; label: string; detail?: string };

export type SelectFieldProps = {
  label: string;
  value: string | undefined;
  options: readonly SelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  noHelper?: boolean;
  disabled?: boolean;
  /** `menu` drops a short list under the field; `sheet` opens a radio list in a sheet. */
  mode?: 'menu' | 'sheet';
  className?: string;
};

/** A field that opens a list. Short lists drop a menu, long ones (more than 6) use a sheet. */
export function SelectField({
  label,
  value,
  options,
  onValueChange,
  placeholder,
  hint,
  error,
  noHelper,
  disabled,
  mode = options.length > 6 ? 'sheet' : 'menu',
  className,
}: SelectFieldProps) {
  const selected = options.find((o) => o.value === value);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (mode === 'sheet') {
    return (
      <Field label={label} hint={hint} error={error} noHelper={noHelper} className={className}>
        <FieldButton
          label={label}
          value={selected?.label}
          placeholder={placeholder}
          invalid={!!error}
          disabled={disabled}
          onPress={() => setSheetOpen(true)}
        />
        <Sheet title={label} open={sheetOpen} onClose={() => setSheetOpen(false)}>
          <RadioList
            accessibilityLabel={label}
            items={options}
            value={value}
            onValueChange={(v) => {
              onValueChange(v);
              setSheetOpen(false);
            }}
          />
        </Sheet>
      </Field>
    );
  }

  return (
    <Field label={label} hint={hint} error={error} noHelper={noHelper} className={className}>
      <SelectPrimitive.Root
        value={selected ? { value: selected.value, label: selected.label } : undefined}
        onValueChange={(option) => {
          if (option) onValueChange(option.value);
        }}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${selected?.label ?? placeholder ?? ''}`}
          className={cn(fieldBoxClass({ invalid: !!error, disabled }), 'gap-2 active:opacity-85')}
        >
          <Text
            numberOfLines={1}
            className={cn('flex-1 text-body', selected ? 'text-ink' : 'text-ink-muted')}
          >
            {selected?.label ?? placeholder}
          </Text>
          <Icon name="chevron-down" size={20} tone="ink-muted" />
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Overlay className="absolute inset-0">
            <SelectPrimitive.Content side="bottom" sideOffset={4} className="min-w-[200px]">
              <Animated.View
                entering={FadeIn.duration(motion.duration.fast)}
                exiting={FadeOut.duration(motion.duration.fast)}
                className="max-h-[320px] overflow-hidden rounded-md bg-surface shadow-raised dark:border dark:border-border"
              >
                <ScrollView>
                  {options.map((o) => (
                    <SelectPrimitive.Item
                      key={o.value}
                      value={o.value}
                      label={o.label}
                      className="min-h-[48px] flex-row items-center gap-3 px-4 active:bg-accent-soft"
                    >
                      <View className="flex-1">
                        <SelectPrimitive.ItemText className="text-body text-ink" />
                        {o.detail ? (
                          <Text className="text-caption text-ink-muted">{o.detail}</Text>
                        ) : null}
                      </View>
                      <SelectPrimitive.ItemIndicator>
                        <Icon name="check" size={20} tone="accent" />
                      </SelectPrimitive.ItemIndicator>
                    </SelectPrimitive.Item>
                  ))}
                </ScrollView>
              </Animated.View>
            </SelectPrimitive.Content>
          </SelectPrimitive.Overlay>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </Field>
  );
}

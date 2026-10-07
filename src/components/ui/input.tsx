import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useId, useRef, useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { useThemeColors } from '@/theme/colors';

import { Field, fieldBoxClass } from './field';
import { useInSheet } from './sheet';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export type InputProps = Omit<
  TextInputProps,
  'secureTextEntry' | 'keyboardType' | 'inputMode' | 'style' | 'placeholderTextColor'
> & {
  label?: string;
  hint?: string;
  error?: string;
  noHelper?: boolean;
  /** Keyboard: `numeric` for whole numbers (months, size), `decimal` for prices. */
  keyboard?: 'text' | 'numeric' | 'decimal';
  /** Unit shown inside the field on the right ("ml", "€"). */
  suffix?: string;
  /** Icon drawn inside the field on the left (search). */
  leadingIcon?: IconName;
  /** `password` hides the text with no way to show it. */
  type?: 'text' | 'password';
  /** Hidden as typed, with an eye button that shows it (the recovery answer). */
  secret?: boolean;
  className?: string;
};

/** Text field with its label and reserved helper line. */
export function Input({
  label,
  hint,
  error,
  noHelper,
  keyboard = 'text',
  suffix,
  leadingIcon,
  type = 'text',
  secret,
  multiline,
  editable = true,
  onFocus,
  onBlur,
  className,
  accessibilityLabel,
  ...props
}: InputProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const id = useId();
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const hidden = type === 'password' || (!!secret && !revealed);
  // Inside a bottom sheet the sheet's own input keeps the keyboard and the sheet in step.
  const TextField = (useInSheet() ? BottomSheetTextInput : TextInput) as typeof TextInput;

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      noHelper={noHelper}
      nativeID={`${id}-label`}
      onLabelPress={() => input.current?.focus()}
      className={className}
    >
      <View
        className={cn(
          fieldBoxClass({ invalid: !!error, disabled: !editable, focused }),
          multiline && 'items-start py-2.5',
        )}
      >
        {leadingIcon ? (
          <View className="mr-2">
            <Icon name={leadingIcon} size={20} tone="ink-muted" />
          </View>
        ) : null}
        <TextField
          ref={input}
          editable={editable}
          multiline={multiline}
          scrollEnabled={multiline ? true : undefined}
          textAlignVertical={multiline ? 'top' : 'center'}
          secureTextEntry={hidden}
          autoCapitalize={secret || type === 'password' ? 'none' : props.autoCapitalize}
          autoCorrect={secret || type === 'password' ? false : props.autoCorrect}
          keyboardType={
            keyboard === 'numeric'
              ? 'number-pad'
              : keyboard === 'decimal'
                ? 'decimal-pad'
                : 'default'
          }
          placeholderTextColor={colors['ink-muted']}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityLabelledBy={label ? `${id}-label` : undefined}
          accessibilityHint={error ?? hint}
          accessibilityState={{ disabled: !editable }}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className={cn(
            'flex-1 font-sans text-ink',
            // A line height on a single-line iOS input shifts the text, so only multiline gets it.
            multiline ? 'max-h-[160px] min-h-[96px] text-body' : 'min-h-[46px] text-[15px]',
          )}
          {...props}
        />
        {suffix ? <Text className="ml-2 text-body text-ink-muted">{suffix}</Text> : null}
        {secret ? (
          <Pressable
            onPress={() => setRevealed((r) => !r)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? t('a11y.hideAnswer') : t('a11y.showAnswer')}
            className="-mr-3 h-[44px] w-[44px] items-center justify-center active:opacity-85"
          >
            <Icon name={revealed ? 'eye-off' : 'eye'} size={20} tone="ink-muted" />
          </Pressable>
        ) : null}
      </View>
    </Field>
  );
}

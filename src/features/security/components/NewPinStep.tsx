import { useCallback, useRef, useState, type Ref } from 'react';
import { View } from 'react-native';

import { PIN_LENGTH, PinPad, type PinPadHandle } from '@/components/ui/pin-pad';
import { Text } from '@/components/ui/text';

/**
 * Digits typed on a PIN step, kept in a ref (never shown) with the dot count in state.
 * `onComplete` gets the 4 digits and a function that empties the dots again.
 */
export function usePinDigits(
  onComplete: (pin: string, clear: () => void) => void,
  onFirstDigit?: () => void,
) {
  const digits = useRef('');
  const [filled, setFilled] = useState(0);

  const set = useCallback((next: string) => {
    digits.current = next;
    setFilled(next.length);
  }, []);

  const clear = useCallback(() => set(''), [set]);

  const onDigit = useCallback(
    (d: string) => {
      if (digits.current.length >= PIN_LENGTH) return;
      if (digits.current.length === 0) onFirstDigit?.();
      const next = digits.current + d;
      set(next);
      if (next.length === PIN_LENGTH) onComplete(next, clear);
    },
    [clear, onComplete, onFirstDigit, set],
  );

  const onDelete = useCallback(() => set(digits.current.slice(0, -1)), [set]);

  return { filled, onDigit, onDelete, clear };
}

export type NewPinStepProps = {
  title: string;
  body?: string;
  filled: number;
  message?: string;
  disabled?: boolean;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  padRef?: Ref<PinPadHandle>;
};

/**
 * The O2/O3 layout inside L2 (Create a new PIN, Enter it again): title on top and the PinPad
 * pinned to the bottom, so a message in its reserved line never moves it.
 */
export function NewPinStep({
  title,
  body,
  filled,
  message,
  disabled,
  onDigit,
  onDelete,
  padRef,
}: NewPinStepProps) {
  return (
    <View className="flex-1 justify-between px-6 pb-6">
      <View className="gap-2 pt-6">
        <Text accessibilityRole="header" className="text-center text-title-l">
          {title}
        </Text>
        {body ? <Text className="text-center text-body text-ink-muted">{body}</Text> : null}
      </View>
      <PinPad
        ref={padRef}
        filled={filled}
        message={message}
        disabled={disabled}
        onDigit={onDigit}
        onDelete={onDelete}
      />
    </View>
  );
}

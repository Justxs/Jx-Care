import { useCallback, useEffect, useRef, useState, type Ref } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PIN_LENGTH, PinPad, type PinPadHandle } from '@/components/ui/pin-pad';
import { Text } from '@/components/ui/text';
import { motion } from '@/theme/motion';

import { validateNewPin } from '../pin';

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
 * The O2/O3 layout (onboarding, Forgot PIN, Change PIN): title on top and the PinPad pinned to
 * the bottom, so a message in its reserved line never moves it.
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

/** After a mismatch: the 300 ms shake, then a moment to read the message before step 1 returns. */
export const MISMATCH_BACK_MS = motion.duration.slow + 400;

/** "Create a new PIN" under the O2 rules: a weak PIN shakes and is refused in place. */
export function CreateNewPinStep({ onPicked }: { onPicked: (pin: string) => void }) {
  const { t } = useTranslation();
  const pad = useRef<PinPadHandle>(null);
  const [error, setError] = useState<string | null>(null);

  const entry = usePinDigits(
    (pin, clear) => {
      const problem = validateNewPin(pin);
      if (problem) {
        pad.current?.shake();
        setError(t(problem, { pin }));
        clear();
        return;
      }
      onPicked(pin);
    },
    () => setError(null),
  );

  return (
    <NewPinStep
      title={t('lock.newPin.createTitle')}
      body={t('lock.newPin.createBody')}
      filled={entry.filled}
      message={error ?? undefined}
      onDigit={entry.onDigit}
      onDelete={entry.onDelete}
      padRef={pad}
    />
  );
}

export type ConfirmNewPinStepProps = {
  /** The PIN picked on the step before. */
  expected: string | null;
  /** A different PIN: back to Create after the shake and the message. */
  onMismatch: () => void;
  /** Saves the PIN and moves on; a throw shows `failedMessage` and lets the person try again. */
  save: (pin: string) => Promise<void>;
  failedMessage: string;
};

/** "Enter it again": a match saves, a mismatch shakes, says so and goes back to Create. */
export function ConfirmNewPinStep({
  expected,
  onMismatch,
  save,
  failedMessage,
}: ConfirmNewPinStepProps) {
  const { t } = useTranslation();
  const pad = useRef<PinPadHandle>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onComplete = async (pin: string, clear: () => void) => {
    setBusy(true);
    if (pin !== expected) {
      pad.current?.shake();
      setError(t('lock.newPin.mismatch'));
      timer.current = setTimeout(onMismatch, MISMATCH_BACK_MS);
      return;
    }
    try {
      await save(pin);
    } catch {
      setBusy(false);
      setError(failedMessage);
      clear();
    }
  };

  const entry = usePinDigits(
    (pin, clear) => void onComplete(pin, clear),
    () => setError(null),
  );

  return (
    <NewPinStep
      title={t('lock.newPin.confirmTitle')}
      filled={entry.filled}
      message={error ?? undefined}
      disabled={busy}
      onDigit={entry.onDigit}
      onDelete={entry.onDelete}
      padRef={pad}
    />
  );
}

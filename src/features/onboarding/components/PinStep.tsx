import { useFocusEffect } from 'expo-router';

import {
  NewPinStep,
  usePinDigits,
  type NewPinStepProps,
} from '@/features/security/components/NewPinStep';

import { OnboardingFrame } from './OnboardingFrame';

/**
 * Digits typed on a PIN step. Starts empty each time the step comes into view (Back from the next
 * step, or O3 sending the person back to O2) and calls `onComplete` on the 4th digit, with a
 * function that empties the dots again.
 */
export function usePinEntry(
  onComplete: (pin: string, clear: () => void) => void,
  onFirstDigit?: () => void,
) {
  const entry = usePinDigits(onComplete, onFirstDigit);
  useFocusEffect(entry.clear);
  return entry;
}

export type PinStepProps = NewPinStepProps & { step: number };

/** O2 and O3: title on top, the PinPad pinned to the bottom so a message never moves it. */
export function PinStep({ step, ...rest }: PinStepProps) {
  return (
    <OnboardingFrame step={step}>
      <NewPinStep {...rest} />
    </OnboardingFrame>
  );
}

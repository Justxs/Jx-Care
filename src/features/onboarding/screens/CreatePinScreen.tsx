import { useSelector } from '@tanstack/react-store';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { PinPadHandle } from '@/components/ui/pin-pad';
import { validateNewPin } from '@/features/security/pin';

import { PinStep, usePinEntry } from '../components/PinStep';
import { clearMismatch, draftStore, setDraftPin } from '../draft';

/** O2 Create PIN. Moves on by itself after the 4th digit; weak PINs are refused in place. */
export function CreatePinScreen() {
  const { t } = useTranslation();
  const pad = useRef<PinPadHandle>(null);
  const [error, setError] = useState<string | null>(null);
  const mismatch = useSelector(draftStore, (s) => s.mismatch);

  const onComplete = useCallback(
    (pin: string, clear: () => void) => {
      const problem = validateNewPin(pin);
      if (problem) {
        pad.current?.shake();
        setError(t(problem, { pin }));
        clear();
        return;
      }
      setDraftPin(pin);
      router.push('/confirm-pin');
    },
    [t],
  );

  const onFirstDigit = useCallback(() => {
    setError(null);
    clearMismatch();
  }, []);

  const entry = usePinEntry(onComplete, onFirstDigit);

  return (
    <PinStep
      step={1}
      title={t('onboarding.createPinTitle')}
      body={t('onboarding.createPinBody')}
      filled={entry.filled}
      message={error ?? (mismatch ? t('onboarding.pinMismatch') : undefined)}
      onDigit={entry.onDigit}
      onDelete={entry.onDelete}
      padRef={pad}
    />
  );
}

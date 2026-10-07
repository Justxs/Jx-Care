import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { PinPadHandle } from '@/components/ui/pin-pad';
import { motion } from '@/theme/motion';

import { PinStep, usePinEntry } from '../components/PinStep';
import { draftStore, rejectDraftPin } from '../draft';

/** After a mismatch: the 300 ms shake, then a moment to read the message before O2 returns. */
export const MISMATCH_BACK_MS = motion.duration.slow + 400;

/** O3 Confirm PIN. A match moves on; a mismatch shakes, says so and goes back to O2. */
export function ConfirmPinScreen() {
  const { t } = useTranslation();
  const pad = useRef<PinPadHandle>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  // Opened without a PIN from O2 (a link, or a restart): start again at O1.
  const [hasPin] = useState(() => draftStore.state.pin !== null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onComplete = useCallback(
    (pin: string) => {
      if (pin === draftStore.state.pin) {
        router.push('/recovery');
        return;
      }
      pad.current?.shake();
      setError(t('onboarding.pinMismatch'));
      timer.current = setTimeout(() => {
        rejectDraftPin();
        setError(null);
        router.back();
      }, MISMATCH_BACK_MS);
    },
    [t],
  );

  const entry = usePinEntry(onComplete);

  if (!hasPin) return <Redirect href="/welcome" />;

  return (
    <PinStep
      step={2}
      title={t('onboarding.confirmPinTitle')}
      filled={entry.filled}
      message={error ?? undefined}
      disabled={error !== null}
      onDigit={entry.onDigit}
      onDelete={entry.onDelete}
      padRef={pad}
    />
  );
}

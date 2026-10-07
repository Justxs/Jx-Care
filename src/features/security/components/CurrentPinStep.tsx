import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { PinPadHandle } from '@/components/ui/pin-pad';

import { pinService, type PinService } from '../pin';
import { tryAgainText, useCountdown } from '../useCountdown';
import { NewPinStep, usePinDigits } from './NewPinStep';

export type CurrentPinStepProps = {
  title: string;
  body?: string;
  /** The right PIN was typed; it is passed on for the save that follows (never shown). */
  onVerified: (pin: string) => void;
  service?: Pick<PinService, 'verifyPin' | 'lockoutUntil'>;
};

/**
 * Asks for the current PIN on the PinPad before a security change (S6). Wrong tries count toward
 * the same lockout as the lock screen, with the same shake, message and countdown.
 */
export function CurrentPinStep({
  title,
  body,
  onVerified,
  service = pinService,
}: CurrentPinStepProps) {
  const { t } = useTranslation();
  const pad = useRef<PinPadHandle>(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  const [wrong, setWrong] = useState(false);
  // Digits are ignored until the stored lockout is read, so a locked keypad never takes a try.
  const [arrived, setArrived] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const left = useCountdown(lockedUntil);
  const lockedOut = left > 0;

  useEffect(() => {
    mounted.current = true;
    service
      .lockoutUntil(Date.now())
      .catch(() => 0)
      .then((until) => {
        if (!mounted.current) return;
        setLockedUntil(until);
        setArrived(true);
      });
    return () => {
      mounted.current = false;
    };
  }, [service]);

  const onComplete = useCallback(
    async (pin: string, clear: () => void) => {
      if (busy.current) return;
      busy.current = true;
      const result = await service.verifyPin(pin, Date.now());
      busy.current = false;
      if (!mounted.current) return;
      if (result.ok) {
        onVerified(pin);
        return;
      }
      clear();
      if (result.locked) {
        setLockedUntil(result.lockedUntil);
        return;
      }
      pad.current?.shake();
      setWrong(true);
      if (result.lockedUntil) setLockedUntil(result.lockedUntil);
    },
    [onVerified, service],
  );

  const entry = usePinDigits(
    (pin, clear) => void onComplete(pin, clear),
    () => setWrong(false),
  );

  const message = lockedOut ? tryAgainText(t, left) : wrong ? t('lock.wrongPin') : undefined;

  return (
    <NewPinStep
      title={title}
      body={body}
      filled={entry.filled}
      message={message}
      disabled={lockedOut}
      onDigit={(d) => {
        if (arrived && !lockedOut) entry.onDigit(d);
      }}
      onDelete={entry.onDelete}
      padRef={pad}
    />
  );
}

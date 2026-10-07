import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { PinPadHandle } from '@/components/ui/pin-pad';

import { pinService, type PinService } from '../pin';
import { tryAgainText, useCountdown } from '../useCountdown';
import { NewPinStep, usePinDigits } from './NewPinStep';

type PinCheckService = Pick<PinService, 'verifyPin' | 'lockoutUntil'>;

/**
 * Checks the current PIN on the PinPad under the lock screen's lockout (L1, S6). The stored
 * lockout is read first and digits wait for it, so a locked keypad never takes a try. A wrong PIN
 * shakes and says so; 5 and 10 wrong tries lock the keypad with a countdown computed from the
 * lockout's end. Spread the result's PinPad props onto the pad.
 */
export function usePinCheck(
  onVerified: (pin: string) => void,
  service: PinCheckService = pinService,
) {
  const { t } = useTranslation();
  const pad = useRef<PinPadHandle>(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  const [wrong, setWrong] = useState(false);
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

  return {
    /** The stored lockout has been read. */
    arrived,
    /** When the lockout read on arrival or started by a try ends (ms), 0 for none. */
    lockedUntil,
    padProps: {
      ref: pad,
      filled: entry.filled,
      message: lockedOut ? tryAgainText(t, left) : wrong ? t('lock.wrongPin') : undefined,
      disabled: lockedOut,
      onDigit: (d: string) => {
        if (arrived && !lockedOut) entry.onDigit(d);
      },
      onDelete: entry.onDelete,
    },
  };
}

export type CurrentPinStepProps = {
  title: string;
  body?: string;
  /** The right PIN was typed; it is passed on for the save that follows (never shown). */
  onVerified: (pin: string) => void;
  service?: PinCheckService;
};

/**
 * Asks for the current PIN on the PinPad before a security change (S6). Wrong tries count toward
 * the same lockout as the lock screen, with the same shake, message and countdown.
 */
export function CurrentPinStep({ title, body, onVerified, service }: CurrentPinStepProps) {
  const { ref, ...pad } = usePinCheck(onVerified, service).padProps;
  return <NewPinStep title={title} body={body} padRef={ref} {...pad} />;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { PIN_LENGTH, PinPad, type PinPadHandle } from '@/components/ui/pin-pad';
import { Text } from '@/components/ui/text';
import { useSettings } from '@/features/settings/api';

import { authenticate } from '../biometrics';
import { unlock } from '../lock';
import { pinService } from '../pin';
import { tryAgainText, useCountdown } from '../useCountdown';

export type LockScreenProps = {
  /** "Forgot PIN?": L2 slides in over this screen. */
  onForgot: () => void;
  /** Hidden from screen readers while L2 is on top. */
  covered?: boolean;
};

/**
 * L1 Lock screen: logo, "Enter PIN", the PinPad (with the biometrics key when it is on) and
 * "Forgot PIN?". The biometrics prompt opens once on arrival; after a failed or cancelled prompt
 * only the key opens it again. Wrong PIN: shake and haptic; 5 and 10 wrong tries lock the keypad
 * with a countdown computed from the lockout's end, so it is right after time in the background.
 */
export function LockScreen({ onForgot, covered = false }: LockScreenProps) {
  const { t } = useTranslation();
  const pad = useRef<PinPadHandle>(null);
  const digits = useRef('');
  const busy = useRef(false);
  const mounted = useRef(true);
  const prompted = useRef(false);
  const [arrived, setArrived] = useState(false);
  const [filled, setFilled] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const left = useCountdown(lockedUntil);
  const lockedOut = left > 0;
  const settings = useSettings().data;
  const biometricsOn = settings?.biometricsOn === true;
  const settingsLoaded = settings !== undefined;

  const setDigits = useCallback((next: string) => {
    digits.current = next;
    setFilled(next.length);
  }, []);

  const tryBiometrics = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const ok = await authenticate(t('lock.biometricsPrompt'));
    busy.current = false;
    if (!ok) return;
    pinService.resetPinFailures().catch(() => {});
    if (mounted.current) unlock();
  }, [t]);

  // Arrival: read a running lockout first, so a locked-out keypad never flashes as usable.
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    pinService
      .lockoutUntil(Date.now())
      .catch(() => 0)
      .then((until) => {
        if (cancelled) return;
        setLockedUntil(until);
        setArrived(true);
      });
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, []);

  // Then the biometrics prompt, once (never during a lockout); after that only the key opens it.
  useEffect(() => {
    if (!arrived || !settingsLoaded || prompted.current) return;
    prompted.current = true;
    if (lockedUntil === 0 && biometricsOn) void tryBiometrics();
  }, [arrived, biometricsOn, lockedUntil, settingsLoaded, tryBiometrics]);

  const check = useCallback(
    async (pin: string) => {
      busy.current = true;
      const result = await pinService.verifyPin(pin, Date.now());
      busy.current = false;
      if (!mounted.current) return;
      if (result.ok) {
        unlock();
        return;
      }
      setDigits('');
      if (result.locked) {
        setLockedUntil(result.lockedUntil);
        return;
      }
      pad.current?.shake();
      setWrong(true);
      if (result.lockedUntil) setLockedUntil(result.lockedUntil);
    },
    [setDigits],
  );

  const onDigit = useCallback(
    (d: string) => {
      if (busy.current || lockedOut || digits.current.length >= PIN_LENGTH) return;
      if (digits.current.length === 0) setWrong(false);
      const next = digits.current + d;
      setDigits(next);
      if (next.length === PIN_LENGTH) void check(next);
    },
    [check, lockedOut, setDigits],
  );

  const onDelete = useCallback(() => setDigits(digits.current.slice(0, -1)), [setDigits]);

  const message = lockedOut ? tryAgainText(t, left) : wrong ? t('lock.wrongPin') : undefined;

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      className="flex-1 bg-canvas"
      importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={covered}
    >
      <View className="flex-1 justify-between px-6 pb-2">
        <View className="items-center gap-4 pt-10">
          <Logo size={72} accessibilityLabel={t('common.appName')} />
          <Text accessibilityRole="header" className="text-center text-title-l">
            {t('lock.enterPin')}
          </Text>
        </View>
        <View className="items-center gap-4">
          <PinPad
            ref={pad}
            filled={filled}
            message={message}
            disabled={lockedOut}
            onDigit={onDigit}
            onDelete={onDelete}
            biometric={biometricsOn}
            onBiometric={() => void tryBiometrics()}
          />
          <Button variant="ghost" block={false} onPress={onForgot}>
            {t('lock.forgotPin')}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

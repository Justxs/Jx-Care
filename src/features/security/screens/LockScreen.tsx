import { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { PinPad } from '@/components/ui/pin-pad';
import { Text } from '@/components/ui/text';
import { useSettings } from '@/features/settings/api';

import { authenticate } from '../biometrics';
import { usePinCheck } from '../components/CurrentPinStep';
import { unlock } from '../lock';
import { pinService } from '../pin';

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
  const { arrived, lockedUntil, padProps } = usePinCheck(unlock);
  const prompting = useRef(false);
  const prompted = useRef(false);
  const settings = useSettings().data;
  const biometricsOn = settings?.biometricsOn === true;
  const settingsLoaded = settings !== undefined;

  const tryBiometrics = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    const ok = await authenticate(t('lock.biometricsPrompt'));
    prompting.current = false;
    if (!ok) return;
    pinService.resetPinFailures().catch(() => {});
    unlock();
  }, [t]);

  // After the running lockout is read, the biometrics prompt, once (never during a lockout);
  // after that only the key opens it.
  useEffect(() => {
    if (!arrived || !settingsLoaded || prompted.current) return;
    prompted.current = true;
    if (lockedUntil === 0 && biometricsOn) void tryBiometrics();
  }, [arrived, biometricsOn, lockedUntil, settingsLoaded, tryBiometrics]);

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
          <PinPad {...padProps} biometric={biometricsOn} onBiometric={() => void tryBiometrics()} />
          <Button variant="ghost" block={false} onPress={onForgot}>
            {t('lock.forgotPin')}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

import { router, useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ScreenHeader } from '@/components/ui/screen-header';
import { showToast } from '@/state/ui';

import { CurrentPinStep } from '../components/CurrentPinStep';
import { ConfirmNewPinStep, CreateNewPinStep } from '../components/NewPinStep';
import { pinService } from '../pin';

type Step = 'old' | 'create' | 'confirm';

/**
 * S6 Change PIN: the current PIN (wrong tries count toward the lock screen's lockout), a new PIN
 * under the O2 rules, then the same again. Saving calls `changePin`, shows "PIN changed" and goes
 * back. Back steps back through the flow; from the first step it leaves.
 */
export function ChangePinScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [step, setStep] = useState<Step>('old');
  // The PINs are never shown; only secure storage keeps them once the change is saved.
  const oldPin = useRef<string | null>(null);
  const [newPin, setNewPin] = useState<string | null>(null);
  const leaving = useRef(false);

  const leave = useCallback(() => {
    leaving.current = true;
    oldPin.current = null;
    router.back();
  }, []);

  const restart = useCallback(() => {
    oldPin.current = null;
    setNewPin(null);
    setStep('old');
  }, []);

  const back = useCallback(() => {
    if (step === 'confirm') {
      setNewPin(null);
      setStep('create');
    } else if (step === 'create') {
      restart();
    } else {
      leave();
    }
  }, [leave, restart, step]);

  // Android back and the swipe step back through the flow the same way the header arrow does.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (leaving.current || step === 'old') return;
        e.preventDefault();
        back();
      }),
    [back, navigation, step],
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-canvas">
      <ScreenHeader title={t('security.changePin.title')} onBack={back} />
      {step === 'old' ? (
        <CurrentPinStep
          title={t('security.changePin.oldTitle')}
          onVerified={(pin) => {
            oldPin.current = pin;
            setStep('create');
          }}
        />
      ) : step === 'create' ? (
        <CreateNewPinStep
          onPicked={(pin) => {
            setNewPin(pin);
            setStep('confirm');
          }}
        />
      ) : (
        <ConfirmNewPinStep
          expected={newPin}
          onMismatch={() => {
            setNewPin(null);
            setStep('create');
          }}
          failedMessage={t('security.changePin.failed')}
          save={async (pin) => {
            const old = oldPin.current;
            const result = old === null ? null : await pinService.changePin(old, pin);
            // The old PIN stopped matching (or a lockout started elsewhere): ask for it again.
            if (!result?.ok) {
              restart();
              return;
            }
            showToast({ message: t('security.changePin.changed') });
            leave();
          }}
        />
      )}
    </SafeAreaView>
  );
}

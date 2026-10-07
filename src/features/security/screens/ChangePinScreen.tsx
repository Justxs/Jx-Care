import { router, useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import type { PinPadHandle } from '@/components/ui/pin-pad';
import { ScreenHeader } from '@/components/ui/screen-header';
import { showToast } from '@/state/ui';

import { CurrentPinStep } from '../components/CurrentPinStep';
import { NewPinStep, usePinDigits } from '../components/NewPinStep';
import { pinService, validateNewPin } from '../pin';
import { MISMATCH_BACK_MS } from './ForgotPinScreen';

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

  const back = useCallback(() => {
    if (step === 'confirm') {
      setNewPin(null);
      setStep('create');
    } else if (step === 'create') {
      oldPin.current = null;
      setStep('old');
    } else {
      leave();
    }
  }, [leave, step]);

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
        <CreateStep
          onPicked={(pin) => {
            setNewPin(pin);
            setStep('confirm');
          }}
        />
      ) : (
        <ConfirmStep
          expected={newPin}
          onMismatch={() => {
            setNewPin(null);
            setStep('create');
          }}
          save={async (pin) => {
            const old = oldPin.current;
            if (old === null) return 'restart';
            const result = await pinService.changePin(old, pin);
            if (!result.ok) return 'restart';
            showToast({ message: t('security.changePin.changed') });
            leave();
            return 'done';
          }}
          onRestart={() => {
            oldPin.current = null;
            setNewPin(null);
            setStep('old');
          }}
        />
      )}
    </SafeAreaView>
  );
}

function CreateStep({ onPicked }: { onPicked: (pin: string) => void }) {
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

type SaveOutcome = 'done' | 'restart';

function ConfirmStep({
  expected,
  onMismatch,
  save,
  onRestart,
}: {
  expected: string | null;
  onMismatch: () => void;
  save: (pin: string) => Promise<SaveOutcome>;
  onRestart: () => void;
}) {
  const { t } = useTranslation();
  const pad = useRef<PinPadHandle>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onComplete = async (pin: string, clear: () => void) => {
    if (pin !== expected) {
      pad.current?.shake();
      setBusy(true);
      setError(t('lock.newPin.mismatch'));
      timer.current = setTimeout(onMismatch, MISMATCH_BACK_MS);
      return;
    }
    setBusy(true);
    let outcome: SaveOutcome;
    try {
      outcome = await save(pin);
    } catch {
      setBusy(false);
      setError(t('security.changePin.failed'));
      clear();
      return;
    }
    // The old PIN stopped matching (or a lockout started elsewhere): ask for it again.
    if (outcome === 'restart') onRestart();
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

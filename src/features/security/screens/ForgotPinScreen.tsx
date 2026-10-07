import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { BOTTOM_BAR_HEIGHT, BottomBar } from '@/components/ui/bottom-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PinPadHandle } from '@/components/ui/pin-pad';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { motion } from '@/theme/motion';

import { NewPinStep, usePinDigits } from '../components/NewPinStep';
import { ResetDialog } from '../components/ResetDialog';
import { pinService, presetQuestionKey, validateNewPin, type RecoveryQuestion } from '../pin';
import { tryAgainText, useCountdown } from '../useCountdown';

/** After a mismatch: the 300 ms shake, then a moment to read the message before step 1 returns. */
export const MISMATCH_BACK_MS = motion.duration.slow + 400;

export type ForgotPinScreenProps = {
  /** Back to L1. */
  onClose: () => void;
  /** The new PIN is saved: unlock on Today. */
  onDone: () => void;
  /** Where the reset dialog renders (the lock layer's own PortalHost). */
  portalHost?: string;
};

type Step = 'answer' | 'create' | 'confirm';

/**
 * L2 Forgot PIN: the saved question and a hidden answer field. The right answer leads to Create a
 * new PIN and Enter it again (the O2/O3 layout), then Today. 5 wrong answers lock the field for
 * 15 minutes. "Reset app and delete all data" is always there as the last resort.
 */
export function ForgotPinScreen({ onClose, onDone, portalHost }: ForgotPinScreenProps) {
  const [step, setStep] = useState<Step>('answer');
  const [newPin, setNewPin] = useState<string | null>(null);

  const back = useCallback(() => {
    if (step === 'confirm') setStep('create');
    else onClose();
  }, [onClose, step]);

  // Android back follows the header's back arrow (registered after the lock layer's, so first).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => sub.remove();
  }, [back]);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-canvas">
      {step === 'answer' ? (
        <AnswerStep onBack={back} onCorrect={() => setStep('create')} portalHost={portalHost} />
      ) : step === 'create' ? (
        <CreateStep
          onBack={back}
          onPicked={(pin) => {
            setNewPin(pin);
            setStep('confirm');
          }}
        />
      ) : (
        <ConfirmStep
          onBack={back}
          expected={newPin}
          onMismatch={() => {
            setNewPin(null);
            setStep('create');
          }}
          onDone={onDone}
        />
      )}
    </SafeAreaView>
  );
}

function questionText(t: (key: string) => string, q: RecoveryQuestion): string {
  return q.kind === 'preset' ? t(presetQuestionKey(q.id)) : q.text;
}

function AnswerStep({
  onBack,
  onCorrect,
  portalHost,
}: {
  onBack: () => void;
  onCorrect: () => void;
  portalHost?: string;
}) {
  const { t } = useTranslation();
  // undefined while reading secure storage, null when nothing is saved.
  const [question, setQuestion] = useState<RecoveryQuestion | null | undefined>(undefined);
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetFailed, setResetFailed] = useState(false);
  const left = useCountdown(lockedUntil);
  const lockedOut = left > 0;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      pinService.getRecoveryQuestion().catch(() => null),
      pinService.recoveryLockoutUntil(Date.now()).catch(() => 0),
    ]).then(([q, until]) => {
      if (cancelled) return;
      setQuestion(q);
      setLockedUntil(until);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    if (busy || lockedOut || !question || answer.trim().length === 0) return;
    setBusy(true);
    const result = await pinService.verifyRecoveryAnswer(answer, Date.now());
    setBusy(false);
    if (result.ok) {
      onCorrect();
      return;
    }
    if (result.locked || result.lockedUntil) {
      setLockedUntil(result.lockedUntil ?? 0);
      setAnswer('');
    }
    setWrong(!result.locked && !result.lockedUntil);
  };

  const error = lockedOut
    ? tryAgainText(t, left)
    : wrong
      ? t('lock.forgot.wrongAnswer')
      : undefined;

  return (
    <View className="flex-1">
      <ScreenHeader title={t('lock.forgot.title')} onBack={onBack} />
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={BOTTOM_BAR_HEIGHT + 16}
        contentContainerClassName="gap-6 px-4 pb-6 pt-4"
      >
        <Text className="text-body text-ink-muted">{t('lock.forgot.body')}</Text>
        {question === null ? (
          <Text className="text-body text-ink">{t('lock.forgot.noQuestion')}</Text>
        ) : (
          <View className="gap-4">
            <View className="min-h-[52px] gap-1">
              <Text className="text-label text-ink-muted">{t('lock.forgot.question')}</Text>
              <Text className="text-body-strong">{question ? questionText(t, question) : ''}</Text>
            </View>
            <Input
              label={t('lock.forgot.answer')}
              hint={t('lock.forgot.answerHint')}
              error={error}
              value={answer}
              onChangeText={(text) => {
                setAnswer(text);
                if (wrong) setWrong(false);
              }}
              secret
              editable={!lockedOut && question !== undefined}
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
            />
          </View>
        )}
        {resetFailed ? (
          <Text accessibilityLiveRegion="polite" className="text-caption text-danger">
            {t('lock.reset.failed')}
          </Text>
        ) : null}
      </KeyboardAwareScrollView>
      <BottomBar>
        {question !== null ? (
          <Button
            loading={busy}
            disabled={lockedOut || answer.trim().length === 0}
            onPress={() => void submit()}
          >
            {t('common.continue')}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          onPress={() => {
            setResetFailed(false);
            setResetOpen(true);
          }}
        >
          {t('lock.forgot.resetLink')}
        </Button>
      </BottomBar>
      <ResetDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        onFailed={() => setResetFailed(true)}
        portalHost={portalHost}
      />
    </View>
  );
}

function CreateStep({ onBack, onPicked }: { onBack: () => void; onPicked: (pin: string) => void }) {
  const { t } = useTranslation();
  const pad = useRef<PinPadHandle>(null);
  const [error, setError] = useState<string | null>(null);

  const onComplete = useCallback(
    (pin: string, clear: () => void) => {
      const problem = validateNewPin(pin);
      if (problem) {
        pad.current?.shake();
        setError(t(problem, { pin }));
        clear();
        return;
      }
      onPicked(pin);
    },
    [onPicked, t],
  );

  const entry = usePinDigits(onComplete, () => setError(null));

  return (
    <View className="flex-1">
      <ScreenHeader title={t('lock.forgot.title')} onBack={onBack} />
      <NewPinStep
        title={t('lock.newPin.createTitle')}
        body={t('lock.newPin.createBody')}
        filled={entry.filled}
        message={error ?? undefined}
        onDigit={entry.onDigit}
        onDelete={entry.onDelete}
        padRef={pad}
      />
    </View>
  );
}

function ConfirmStep({
  onBack,
  expected,
  onMismatch,
  onDone,
}: {
  onBack: () => void;
  expected: string | null;
  onMismatch: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const pad = useRef<PinPadHandle>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mismatch, setMismatch] = useState(false);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onComplete = useCallback(
    async (pin: string, clear: () => void) => {
      if (pin !== expected) {
        pad.current?.shake();
        setMismatch(true);
        setError(t('lock.newPin.mismatch'));
        timer.current = setTimeout(onMismatch, MISMATCH_BACK_MS);
        return;
      }
      setSaving(true);
      try {
        await pinService.setPin(pin);
      } catch {
        setSaving(false);
        setError(t('lock.newPin.saveFailed'));
        clear();
        return;
      }
      onDone();
    },
    [expected, onDone, onMismatch, t],
  );

  const entry = usePinDigits(
    (pin, clear) => void onComplete(pin, clear),
    () => setError(null),
  );

  return (
    <View className="flex-1">
      <ScreenHeader title={t('lock.forgot.title')} onBack={onBack} />
      <NewPinStep
        title={t('lock.newPin.confirmTitle')}
        filled={entry.filled}
        message={error ?? undefined}
        disabled={saving || mismatch}
        onDigit={entry.onDigit}
        onDelete={entry.onDelete}
        padRef={pad}
      />
    </View>
  );
}

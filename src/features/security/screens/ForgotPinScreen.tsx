import { useCallback, useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { BOTTOM_BAR_HEIGHT, BottomBar } from '@/components/ui/bottom-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';

import { ConfirmNewPinStep, CreateNewPinStep } from '../components/NewPinStep';
import { ResetDialog } from '../components/ResetDialog';
import { pinService, presetQuestionKey, type RecoveryQuestion } from '../pin';
import { tryAgainText, useCountdown } from '../useCountdown';

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
  const { t } = useTranslation();
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
      <ScreenHeader title={t('lock.forgot.title')} onBack={back} />
      {step === 'answer' ? (
        <AnswerStep onCorrect={() => setStep('create')} portalHost={portalHost} />
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
          failedMessage={t('lock.newPin.saveFailed')}
          save={async (pin) => {
            await pinService.setPin(pin);
            onDone();
          }}
        />
      )}
    </SafeAreaView>
  );
}

function questionText(t: (key: string) => string, q: RecoveryQuestion): string {
  return q.kind === 'preset' ? t(presetQuestionKey(q.id)) : q.text;
}

function AnswerStep({ onCorrect, portalHost }: { onCorrect: () => void; portalHost?: string }) {
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

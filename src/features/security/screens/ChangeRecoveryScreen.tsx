import { useStore } from '@tanstack/react-form';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { BOTTOM_BAR_HEIGHT, BottomBar } from '@/components/ui/bottom-bar';
import { Button } from '@/components/ui/button';
import { useScreenCloseGuard } from '@/components/ui/screen-close-guard';
import { Collapsible } from '@/components/ui/collapsible';
import { DiscardDialog } from '@/components/ui/discard-dialog';
import { useAppForm, useFormDirty } from '@/components/ui/form';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import {
  CUSTOM_QUESTION,
  CUSTOM_QUESTION_MAX,
  emptyRecoveryForm,
  questionOptions,
  recoverySchema,
  toRecoveryQuestion,
  type RecoveryFormValues,
} from '@/features/onboarding/schema';
import { showToast } from '@/state/ui';

import { CurrentPinStep } from '../components/CurrentPinStep';
import { pinService, type RecoveryQuestion } from '../pin';

/** The O4 form's starting values for the saved question; the answer always starts empty. */
export function recoveryFormValues(q: RecoveryQuestion | null): RecoveryFormValues {
  if (q === null) return emptyRecoveryForm;
  return q.kind === 'preset'
    ? { ...emptyRecoveryForm, questionId: q.id }
    : { ...emptyRecoveryForm, questionId: CUSTOM_QUESTION, customText: q.text };
}

/**
 * S6 Recovery question: the PIN first (same lockout as the lock screen), then the O4 form with
 * the saved question picked and an empty answer. Save calls `changeRecovery`, shows "Recovery
 * question changed" and goes back.
 */
export function ChangeRecoveryScreen() {
  const { t } = useTranslation();
  const [pin, setPin] = useState<string | null>(null);
  // undefined while reading secure storage.
  const [saved, setSaved] = useState<RecoveryQuestion | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    pinService
      .getRecoveryQuestion()
      .catch(() => null)
      .then((q) => {
        if (!cancelled) setSaved(q);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (pin === null || saved === undefined) {
    return (
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-canvas">
        <ScreenHeader title={t('security.recovery.title')} onBack={() => router.back()} />
        <CurrentPinStep
          title={t('security.recovery.pinTitle')}
          body={t('security.recovery.pinBody')}
          onVerified={setPin}
        />
      </SafeAreaView>
    );
  }

  return <RecoveryForm pin={pin} initial={recoveryFormValues(saved)} onPinRejected={setPin} />;
}

function RecoveryForm({
  pin,
  initial,
  onPinRejected,
}: {
  pin: string;
  initial: RecoveryFormValues;
  /** The PIN stopped matching before the save: ask for it again. */
  onPinRejected: (pin: null) => void;
}) {
  const { t } = useTranslation();
  // Re-built when the language changes so the presets read in the app's language.
  const options = useMemo(() => questionOptions(t), [t]);

  const form = useAppForm({
    schema: recoverySchema,
    defaultValues: initial,
    onSubmit: async (value) => {
      let ok: boolean;
      try {
        ok = (await pinService.changeRecovery(pin, toRecoveryQuestion(value), value.answer)).ok;
      } catch {
        showToast({ message: t('security.recovery.failed') });
        return;
      }
      if (!ok) {
        onPinRejected(null);
        return;
      }
      showToast({ message: t('security.recovery.changed') });
      guard.leave();
    },
  });

  const isCustom = useStore(form.store, (s) => s.values.questionId === CUSTOM_QUESTION);
  const dirty = useFormDirty(form);
  const guard = useScreenCloseGuard({ dirty });

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-canvas">
      <ScreenHeader title={t('security.recovery.title')} onBack={guard.requestClose} />
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={BOTTOM_BAR_HEIGHT + 16}
        contentContainerClassName="gap-6 px-4 pb-6 pt-4"
      >
        <Text className="text-body text-ink-muted">{t('onboarding.recoveryBody')}</Text>
        <View className="gap-1">
          <form.AppField name="questionId">
            {(field) => (
              <field.SelectField
                label={t('onboarding.question')}
                placeholder={t('onboarding.questionPlaceholder')}
                options={options}
                mode="sheet"
                valueLines={2}
              />
            )}
          </form.AppField>
          <Collapsible open={isCustom}>
            <form.AppField name="customText">
              {(field) => (
                <field.TextField
                  label={t('onboarding.customQuestion')}
                  maxLength={CUSTOM_QUESTION_MAX}
                  autoCapitalize="sentences"
                />
              )}
            </form.AppField>
          </Collapsible>
          <form.AppField name="answer">
            {(field) => (
              <field.TextField
                label={t('onboarding.answer')}
                hint={t('onboarding.answerHint')}
                secret
                returnKeyType="done"
                onSubmitEditing={() => void form.handleSubmit()}
              />
            )}
          </form.AppField>
        </View>
      </KeyboardAwareScrollView>
      <BottomBar>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(submitting) => (
            <Button loading={submitting} onPress={() => void form.handleSubmit()}>
              {t('common.save')}
            </Button>
          )}
        </form.Subscribe>
      </BottomBar>
      <DiscardDialog
        open={guard.confirmOpen}
        onDiscard={guard.discard}
        onKeepEditing={guard.keepEditing}
      />
    </SafeAreaView>
  );
}

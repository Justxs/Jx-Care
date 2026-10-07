import { useStore } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Collapsible } from '@/components/ui/collapsible';
import { useAppForm } from '@/components/ui/form';
import { Text } from '@/components/ui/text';
import { getDb } from '@/db';
import { qk } from '@/db/queryKeys';
import { biometricsAvailable } from '@/features/security/biometrics';
import { isLanguage, phoneLanguage } from '@/i18n';
import { showToast } from '@/state/ui';

import { OnboardingFrame } from '../components/OnboardingFrame';
import { draftStore, setDraftQuestion } from '../draft';
import { finishOnboarding } from '../finish';
import { saveOnboarding } from '../save';
import {
  CUSTOM_QUESTION,
  CUSTOM_QUESTION_MAX,
  emptyRecoveryForm,
  questionOptions,
  recoverySchema,
  toRecoveryQuestion,
} from '../schema';

/**
 * O4 Recovery question. Continue is the first moment anything is saved: PIN and answer to secure
 * storage, then the settings row. O5 follows only when the phone offers biometrics.
 */
export function RecoveryScreen() {
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  // Opened without a confirmed PIN (a link, or a restart): start again at O1.
  const [hasPin] = useState(() => draftStore.state.pin !== null);
  // Re-built when the language changes so the presets read in the app's language.
  const options = useMemo(() => questionOptions(t), [t]);

  const form = useAppForm({
    schema: recoverySchema,
    defaultValues: emptyRecoveryForm,
    onSubmit: async (value) => {
      const pin = draftStore.state.pin;
      if (pin === null) {
        router.replace('/welcome');
        return;
      }
      const question = toRecoveryQuestion(value);
      setDraftQuestion(question);
      const language =
        draftStore.state.language ?? (isLanguage(i18n.language) ? i18n.language : phoneLanguage());
      const bio = await biometricsAvailable();
      try {
        const settings = await saveOnboarding(
          getDb(),
          { language, pin, question, answer: value.answer },
          { biometricKind: bio.available ? bio.kind : null },
        );
        client.setQueryData(qk.settings, settings);
      } catch {
        showToast({ message: t('onboarding.saveFailed') });
        return;
      }
      if (bio.available) router.push('/biometrics');
      else finishOnboarding();
    },
  });

  const isCustom = useStore(form.store, (s) => s.values.questionId === CUSTOM_QUESTION);

  if (!hasPin) return <Redirect href="/welcome" />;

  return (
    <OnboardingFrame
      step={3}
      footer={
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(submitting) => (
            <Button loading={submitting} onPress={() => void form.handleSubmit()}>
              {t('common.continue')}
            </Button>
          )}
        </form.Subscribe>
      }
    >
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={96}
        contentContainerClassName="gap-6 px-6 pb-6 pt-6"
      >
        <View className="gap-2">
          <Text accessibilityRole="header" className="text-center text-title-l">
            {t('onboarding.recoveryTitle')}
          </Text>
          <Text className="text-center text-body text-ink-muted">
            {t('onboarding.recoveryBody')}
          </Text>
        </View>
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
    </OnboardingFrame>
  );
}

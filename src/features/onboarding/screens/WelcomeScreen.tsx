import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { RadioList, type RadioListItem } from '@/components/ui/radio-list';
import { Text } from '@/components/ui/text';
import { isLanguage, phoneLanguage, type Language } from '@/i18n';
import { setLanguage } from '@/state/app';

import { OnboardingFrame } from '../components/OnboardingFrame';
import { draftStore, setDraftLanguage } from '../draft';

/**
 * Each language in its own name, with the other language's name for it underneath, so either
 * reader finds theirs whatever the phone is set to. The same in both languages, so not in i18n.
 */
export const LANGUAGE_CHOICES: readonly (RadioListItem & { value: Language })[] = [
  { value: 'lt', label: 'Lietuvių', detail: 'Lithuanian' },
  { value: 'en', label: 'English', detail: 'Anglų' },
];

/** O1 Welcome and language. Picking a language switches every string in place at once. */
export function WelcomeScreen() {
  const { t, i18n } = useTranslation();
  const [language, setChoice] = useState<Language>(
    () =>
      draftStore.state.language ?? (isLanguage(i18n.language) ? i18n.language : phoneLanguage()),
  );

  const pick = (value: string) => {
    if (!isLanguage(value)) return;
    setChoice(value);
    setDraftLanguage(value);
    // Nothing is saved before O4; the settings row takes the language then.
    void setLanguage(value, { persist: false });
  };

  return (
    <OnboardingFrame
      step={0}
      footer={
        <Button
          onPress={() => {
            setDraftLanguage(language);
            router.push('/create-pin');
          }}
        >
          {t('common.continue')}
        </Button>
      }
    >
      <ScrollView contentContainerClassName="gap-8 px-6 pb-6 pt-4">
        <View className="items-center gap-3">
          <Logo size={84} />
          <Text accessibilityRole="header" className="text-center text-title-l">
            {t('common.appName')}
          </Text>
          <Text className="text-center text-body text-ink-muted">{t('onboarding.pitch')}</Text>
        </View>
        <View className="gap-3">
          <RadioList
            accessibilityLabel={t('onboarding.language')}
            items={LANGUAGE_CHOICES}
            value={language}
            onValueChange={pick}
          />
          <Text className="text-center text-caption text-ink-muted">{t('onboarding.privacy')}</Text>
        </View>
      </ScrollView>
    </OnboardingFrame>
  );
}

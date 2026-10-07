import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SelectField } from '@/components/ui/select-field';
import { ToggleGroup } from '@/components/ui/toggle-group';
import { isLanguage } from '@/i18n';
import { setLanguage } from '@/state/app';

import { useSettings, useUpdateSettings } from '../api';
import { ProgressPrefs } from '../components/ProgressPrefs';
import { currencyOptions } from '../currencies';
import { LANGUAGE_NAMES } from './SettingsScreen';

/** S7 Preferences: language, currency and the progress photo options. */
export function PreferencesScreen() {
  const { t, i18n } = useTranslation();
  const settings = useSettings().data;
  const update = useUpdateSettings();
  // Currency names in the app language ("Euras" / "Euro").
  const currencies = useMemo(() => currencyOptions(i18n.language), [i18n.language]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScreenHeader title={t('screens.preferences')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 32 }}>
        <Card>
          <Field label={t('settings.language')} hint={t('settings.languageHint')}>
            <ToggleGroup
              accessibilityLabel={t('settings.language')}
              items={[
                { value: 'lt', label: LANGUAGE_NAMES.lt },
                { value: 'en', label: LANGUAGE_NAMES.en },
              ]}
              value={settings?.language ?? (isLanguage(i18n.language) ? i18n.language : 'en')}
              onValueChange={(lang) => {
                if (isLanguage(lang)) void setLanguage(lang);
              }}
            />
          </Field>
          <SelectField
            label={t('settings.currency')}
            hint={t('settings.currencyHint')}
            value={settings?.currency}
            options={currencies}
            mode="sheet"
            onValueChange={(currency) => update.mutate({ currency })}
          />
        </Card>

        <ProgressPrefs />
      </ScrollView>
    </SafeAreaView>
  );
}

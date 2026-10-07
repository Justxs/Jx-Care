import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SelectField } from '@/components/ui/select-field';
import { Text } from '@/components/ui/text';
import { ToggleGroup } from '@/components/ui/toggle-group';
import { isLanguage } from '@/i18n';
import { setLanguage } from '@/state/app';

import { useSettings, useUpdateSettings } from '../api';
import { currencyOptions } from '../currencies';
import { LANGUAGE_NAMES } from './SettingsScreen';

/** S7 Preferences: language and currency now; progress photo options come with task 037. */
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

        {/* TODO(037): tracked skin angles, hair album, hair angles (row space reserved), guide. */}
        <Card title={t('settings.progressPhotos')}>
          <View className="min-h-[224px] justify-center">
            <Text className="text-body text-ink-muted">{t('settings.progressSoon')}</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

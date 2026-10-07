import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useFormat } from '@/i18n/useFormat';
import { localDate } from '@/lib/appDay';

import { useSettings } from '../api';

export const LANGUAGE_NAMES = { lt: 'Lietuvių', en: 'English' } as const;

/** S1 Settings: grouped rows that push their screens. */
export function SettingsScreen() {
  const { t } = useTranslation();
  const f = useFormat();
  const settings = useSettings().data;
  const [resetOpen, setResetOpen] = useState(false);
  const lastBackup = settings?.lastBackupAt
    ? f.date(localDate(settings.lastBackupAt))
    : t('settings.never');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 32 }}>
        <Text accessibilityRole="header" className="text-title-l">
          {t('settings.title')}
        </Text>

        <Card title={t('settings.groups.careData')} flush>
          <ListRow
            icon="flask-round"
            label={t('screens.ingredients')}
            onPress={() => router.push('/settings/ingredients')}
          />
          <Separator inset />
          <ListRow
            icon="alert-triangle"
            label={t('screens.conflicts')}
            onPress={() => router.push('/settings/conflicts')}
          />
          <Separator inset />
          <ListRow
            icon="ban"
            label={t('screens.avoid')}
            onPress={() => router.push('/settings/avoid')}
          />
        </Card>

        <Card title={t('settings.groups.notifications')} flush>
          <ListRow
            icon="bell"
            label={t('screens.reminders')}
            onPress={() => router.push('/settings/reminders')}
          />
        </Card>

        <Card title={t('settings.groups.security')} flush>
          <ListRow
            icon="lock"
            label={t('screens.security')}
            onPress={() => router.push('/settings/security')}
          />
        </Card>

        <Card title={t('settings.groups.preferences')} flush>
          <ListRow
            icon="languages"
            label={t('settings.language')}
            value={settings ? LANGUAGE_NAMES[settings.language] : undefined}
            onPress={() => router.push('/settings/preferences')}
          />
          <Separator inset />
          <ListRow
            icon="coins"
            label={t('settings.currency')}
            value={settings?.currency}
            onPress={() => router.push('/settings/preferences')}
          />
          <Separator inset />
          <ListRow
            icon="camera"
            label={t('settings.progressPhotos')}
            onPress={() => router.push('/settings/preferences')}
          />
        </Card>

        <Card title={t('settings.groups.data')} flush>
          <ListRow
            icon="download"
            label={t('screens.backup')}
            value={lastBackup}
            onPress={() => router.push('/settings/backup')}
          />
          <Separator inset />
          <ListRow
            icon="rotate-ccw"
            label={t('settings.resetApp')}
            tone="danger"
            trailing="none"
            onPress={() => setResetOpen(true)}
          />
        </Card>

        <Card title={t('settings.groups.about')} flush>
          <ListRow
            icon="info"
            label={t('settings.version')}
            value={Constants.expoConfig?.version ?? '1.0.0'}
            trailing="value"
          />
          <Separator inset />
          <ListRow
            icon="list"
            label={t('settings.licences')}
            onPress={() => router.push('/settings/licences')}
          />
        </Card>
      </ScrollView>

      {/* TODO(018): the real reset flow (PIN, then typing RESET). */}
      <AlertDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={t('settings.resetSoonTitle')}
        description={t('settings.resetSoonBody')}
        actionLabel={t('common.close')}
        cancelLabel={t('common.cancel')}
        onAction={() => setResetOpen(false)}
      />
    </SafeAreaView>
  );
}

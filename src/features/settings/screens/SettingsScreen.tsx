import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** S1 Settings. Placeholder until task 011. */
export function SettingsScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      specId="S1"
      title={t('screens.settings')}
      task="011"
      nav="none"
      links={[
        { label: t('screens.ingredients'), href: '/settings/ingredients' },
        { label: t('screens.conflicts'), href: '/settings/conflicts' },
        { label: t('screens.avoid'), href: '/settings/avoid' },
        { label: t('screens.reminders'), href: '/settings/reminders' },
        { label: t('screens.security'), href: '/settings/security' },
        { label: t('screens.preferences'), href: '/settings/preferences' },
        { label: t('screens.backup'), href: '/settings/backup' },
      ]}
    />
  );
}

import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** S7 Preferences. Placeholder until task 011. */
export function PreferencesScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen specId="S7" title={t('screens.preferences')} task="011" nav="back" />;
}

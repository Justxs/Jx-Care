import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** S4 Avoid list. Placeholder until task 030. */
export function AvoidListScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen specId="S4" title={t('screens.avoid')} task="030" nav="back" />;
}

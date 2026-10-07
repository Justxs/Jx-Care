import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** S6 PIN and security. Placeholder until task 019. */
export function SecurityScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen specId="S6" title={t('screens.security')} task="019" nav="back" />;
}

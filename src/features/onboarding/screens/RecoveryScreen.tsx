import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** O4 Recovery question. Placeholder until task 017. */
export function RecoveryScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      specId="O4"
      title={t('screens.recovery')}
      task="017"
      nav="back"
      links={[{ label: t('screens.biometrics'), href: '/biometrics' }]}
    />
  );
}

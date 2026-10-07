import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** O5 Face ID or fingerprint. Placeholder until task 017. */
export function BiometricsScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      specId="O5"
      title={t('screens.biometrics')}
      task="017"
      nav="back"
      links={[{ label: t('screens.today'), href: '/' }]}
    />
  );
}

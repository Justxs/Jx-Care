import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** O3 Confirm PIN. Placeholder until task 017. */
export function ConfirmPinScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      specId="O3"
      title={t('screens.confirmPin')}
      task="017"
      nav="back"
      links={[{ label: t('screens.recovery'), href: '/recovery' }]}
    />
  );
}

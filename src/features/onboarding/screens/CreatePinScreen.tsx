import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** O2 Create PIN. Placeholder until task 017. */
export function CreatePinScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      specId="O2"
      title={t('screens.createPin')}
      task="017"
      nav="back"
      links={[{ label: t('screens.confirmPin'), href: '/confirm-pin' }]}
    />
  );
}

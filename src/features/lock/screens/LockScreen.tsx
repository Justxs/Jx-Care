import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** L1 Locked. Placeholder until task 018. */
export function LockScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      specId="L1"
      title={t('screens.lock')}
      task="018"
      nav="none"
      links={[
        { label: t('screens.forgotPin'), href: '/forgot-pin' },
        { label: t('screens.today'), href: '/' },
      ]}
    />
  );
}

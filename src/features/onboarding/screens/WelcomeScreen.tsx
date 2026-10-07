import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** O1 Welcome. Placeholder until task 017. */
export function WelcomeScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      specId="O1"
      title={t('screens.welcome')}
      task="017"
      nav="none"
      links={[{ label: t('screens.createPin'), href: '/create-pin' }]}
    />
  );
}

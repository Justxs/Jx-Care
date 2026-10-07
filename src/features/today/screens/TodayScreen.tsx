import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** T1 Today. Placeholder until task 025. */
export function TodayScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      specId="T1"
      title={t('screens.today')}
      task="025"
      nav="none"
      links={[
        { label: t('screens.player'), href: '/player/1' },
        { label: t('screens.hairDone'), href: '/hair/done/1' },
        { label: t('screens.lock'), href: '/lock' },
        { label: t('screens.welcome'), href: '/welcome' },
      ]}
    />
  );
}

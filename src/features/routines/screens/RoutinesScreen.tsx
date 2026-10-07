import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** R1 Routines. Placeholder until task 023. */
export function RoutinesScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      specId="R1"
      title={t('screens.routines')}
      task="023"
      nav="none"
      links={[
        { label: t('screens.routineEditor'), href: '/routines/1' },
        { label: t('screens.hairTask'), href: '/routines/hair/1' },
        { label: t('screens.player'), href: '/player/1' },
      ]}
    />
  );
}

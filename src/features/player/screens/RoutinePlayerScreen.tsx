import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** T2 Routine. Placeholder until task 026. */
export function RoutinePlayerScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      specId="T2"
      title={t('screens.player')}
      task="026"
      nav="close"
      links={[{ label: t('screens.playerDone'), href: '/player/1/done' }]}
    />
  );
}

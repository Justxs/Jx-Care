import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** C6 Week. Placeholder until task 037. */
export function WeekDetailScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      specId="C6"
      title={t('screens.week')}
      task="037"
      nav="back"
      links={[{ label: t('screens.compare'), href: '/progress/compare' }]}
    />
  );
}

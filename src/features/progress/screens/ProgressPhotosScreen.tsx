import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** C3 Progress photos. Placeholder until task 037. */
export function ProgressPhotosScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      specId="C3"
      title={t('screens.progress')}
      task="037"
      nav="back"
      links={[
        { label: t('screens.week'), href: '/calendar/week/skin/2026-10-05' },
        { label: t('screens.camera'), href: '/progress/camera' },
        { label: t('screens.compare'), href: '/progress/compare' },
      ]}
    />
  );
}

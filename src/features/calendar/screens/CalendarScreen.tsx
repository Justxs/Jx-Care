import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** C1 Calendar. Placeholder until task 028. */
export function CalendarScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      specId="C1"
      title={t('screens.calendar')}
      task="028"
      nav="none"
      links={[
        { label: t('screens.day'), href: '/calendar/day/2026-10-06' },
        { label: t('screens.progress'), href: '/calendar/progress' },
        { label: t('screens.week'), href: '/calendar/week/skin/2026-10-05' },
        { label: t('screens.camera'), href: '/progress/camera' },
      ]}
    />
  );
}

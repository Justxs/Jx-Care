import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** C4 Progress photo. Placeholder until task 036. */
export function ProgressCameraScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      specId="C4"
      title={t('screens.camera')}
      task="036"
      nav="close"
      links={[{ label: t('screens.review'), href: '/progress/review' }]}
    />
  );
}

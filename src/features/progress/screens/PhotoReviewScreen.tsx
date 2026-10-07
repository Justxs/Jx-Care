import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** C5 Review photo. Placeholder until task 036. */
export function PhotoReviewScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen specId="C5" title={t('screens.review')} task="036" nav="back" />;
}

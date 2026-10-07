import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** C7 Compare. Placeholder until task 037. */
export function PhotoCompareScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen specId="C7" title={t('screens.compare')} task="037" nav="close" />;
}

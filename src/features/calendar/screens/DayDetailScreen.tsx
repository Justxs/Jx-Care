import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** C2 Day. Placeholder until task 028. */
export function DayDetailScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen specId="C2" title={t('screens.day')} task="028" nav="back" />;
}

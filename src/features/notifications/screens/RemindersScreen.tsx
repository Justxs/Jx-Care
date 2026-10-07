import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** S5 Reminders. Placeholder until task 021. */
export function RemindersScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen specId="S5" title={t('screens.reminders')} task="021" nav="back" />;
}

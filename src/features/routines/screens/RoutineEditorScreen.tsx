import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** R2 Routine. Placeholder until task 024. */
export function RoutineEditorScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen specId="R2" title={t('screens.routineEditor')} task="024" nav="back" />;
}

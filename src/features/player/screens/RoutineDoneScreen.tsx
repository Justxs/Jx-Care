import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** T2 Routine done. Placeholder until task 026. */
export function RoutineDoneScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen specId="T2" title={t('screens.playerDone')} task="026" nav="close" />;
}

import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** R5 Hair task. Placeholder until task 032. */
export function HairTaskEditorScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen specId="R5" title={t('screens.hairTask')} task="032" nav="back" />;
}

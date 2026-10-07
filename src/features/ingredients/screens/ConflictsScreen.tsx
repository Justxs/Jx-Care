import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** S3 Conflicts. Placeholder until task 029. */
export function ConflictsScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen specId="S3" title={t('screens.conflicts')} task="029" nav="back" />;
}

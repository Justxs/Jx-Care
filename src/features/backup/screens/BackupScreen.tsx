import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** S8 Backup and restore. Placeholder until task 040. */
export function BackupScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen specId="S8" title={t('screens.backup')} task="040" nav="back" />;
}

import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** P5 Archive. Placeholder until task 015. */
export function ArchiveScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen specId="P5" title={t('screens.archive')} task="015" nav="back" />;
}

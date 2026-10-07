import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** S2 Ingredients. Placeholder until task 029. */
export function IngredientsScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen specId="S2" title={t('screens.ingredients')} task="029" nav="back" />;
}

import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** P3 Add product / Edit product. Placeholder until task 014. */
export function ProductFormScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string; fromShoppingItem?: string }>();
  return (
    <PlaceholderScreen
      specId="P3"
      title={id ? t('screens.productEdit') : t('screens.productForm')}
      task="014"
      nav="close"
    />
  );
}

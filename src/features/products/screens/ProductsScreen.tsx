import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** P1 Products. Placeholder until task 013. */
export function ProductsScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      specId="P1"
      title={t('screens.products')}
      task="013"
      nav="none"
      links={[
        { label: t('screens.productDetail'), href: '/products/1' },
        { label: t('screens.archive'), href: '/products/archive' },
        { label: t('screens.productForm'), href: '/product-form' },
      ]}
    />
  );
}

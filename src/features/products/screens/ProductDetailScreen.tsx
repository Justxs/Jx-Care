import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** P2 Product. Placeholder until task 015. */
export function ProductDetailScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      specId="P2"
      title={t('screens.productDetail')}
      task="015"
      nav="back"
      links={[
        {
          label: t('screens.productEdit'),
          href: { pathname: '/product-form', params: { id: '1' } },
        },
      ]}
    />
  );
}

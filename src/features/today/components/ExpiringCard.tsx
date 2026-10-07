import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { ProductRow } from '@/features/products/components/ProductRow';
import type { ProductListItem } from '@/features/products/types';

export type ExpiringCardProps = {
  products: readonly ProductListItem[];
  onProduct: (id: number) => void;
  onSeeAll: () => void;
  /** "Shopping list · 3 to buy" (task 034); null hides the row. */
  toBuy: number | null;
  onShopping: () => void;
};

/**
 * Expiring soon: up to three product rows (an expired row's badge carries the date) and the
 * Shopping list row at the card's foot.
 */
export function ExpiringCard({
  products,
  onProduct,
  onSeeAll,
  toBuy,
  onShopping,
}: ExpiringCardProps) {
  const { t } = useTranslation();
  return (
    <View className="gap-2">
      <View className="min-h-[44px] flex-row items-center justify-between pl-1">
        <Text accessibilityRole="header" className="text-title-s">
          {t('today.expiring.title')}
        </Text>
        <Pressable
          onPress={onSeeAll}
          accessibilityRole="button"
          accessibilityLabel={t('today.expiring.seeAllLabel')}
          className="min-h-[44px] justify-center px-2 active:opacity-85"
        >
          <Text className="text-body-strong text-accent">{t('today.expiring.seeAll')}</Text>
        </Pressable>
      </View>
      <Card flush>
        {products.map((p, i) => (
          <View key={p.id}>
            {i > 0 ? <Separator inset /> : null}
            <ProductRow item={p} onPress={() => onProduct(p.id)} />
          </View>
        ))}
        {toBuy !== null ? (
          <>
            <Separator />
            <Pressable
              onPress={onShopping}
              accessibilityRole="button"
              className="min-h-[56px] flex-row items-center gap-3 px-4 py-3 active:bg-subtle"
            >
              <Icon name="shopping-cart" size={20} tone="ink-muted" />
              <Text className="flex-1 text-body tabular-nums">
                {t('today.expiring.shopping', { count: toBuy })}
              </Text>
              <Icon name="chevron-right" size={20} tone="ink-muted" />
            </Pressable>
          </>
        ) : null}
      </Card>
    </View>
  );
}

import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

import { useToBuyCount } from '../api';
import { openShoppingList } from '../viewState';

/**
 * Today's "Shopping list · 3 to buy" row at the foot of the Expiring soon card (spec T1).
 * Hidden while nothing is to buy; opens the Shopping segment of Products.
 */
export function ShoppingListRow() {
  const { t } = useTranslation();
  const count = useToBuyCount().data ?? 0;
  if (count === 0) return null;
  const label = t('shopping.todayRow', { count });
  return (
    <Pressable
      onPress={openShoppingList}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="min-h-[52px] flex-row items-center gap-3 px-4 py-3 active:bg-accent-soft"
    >
      <Icon name="shopping-cart" size={20} tone="ink-muted" />
      <Text className="flex-1 text-body tabular-nums">{label}</Text>
      <Icon name="chevron-right" size={20} tone="ink-muted" />
    </Pressable>
  );
}

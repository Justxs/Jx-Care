import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AreaTag } from '@/components/ui/area-tag';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Text } from '@/components/ui/text';
import { useFormat } from '@/i18n/useFormat';
import { appDay } from '@/lib/appDay';
import { cn } from '@/lib/cn';

import { formatSize } from '../repo';
import type { ShoppingRowItem } from '../types';

export type ShoppingRowAction = { key: string; label: string; onPress: () => void };

export type ShoppingRowProps = {
  item: ShoppingRowItem;
  onToggle: (bought: boolean) => void;
  /** Long press: the row's action sheet (Edit, Move, Delete). */
  onLongPress?: () => void;
  /** The same actions for screen readers. */
  actions?: readonly ShoppingRowAction[];
  /** Want to try rows: "Move to To buy". */
  onMoveToBuy?: () => void;
  /** Bought rows not yet in Products: the inline "Add it to your products" line. */
  onAddProduct?: () => void;
};

/** P6 row: checkbox, name, brand, AreaTag, last price and size for linked items, note. */
export function ShoppingRow({
  item,
  onToggle,
  onLongPress,
  actions = [],
  onMoveToBuy,
  onAddProduct,
}: ShoppingRowProps) {
  const { t, i18n } = useTranslation();
  const f = useFormat();
  const bought = item.boughtAt !== null;

  const meta = [
    item.priceCents !== null ? f.money(item.priceCents) : null,
    item.size !== null ? formatSize(item.size, item.unit, t, i18n.language) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const boughtLine =
    item.boughtAt !== null ? t('shopping.boughtOn', { date: f.date(appDay(item.boughtAt)) }) : null;

  const toggle = () => {
    if (!bought) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onToggle(!bought);
  };

  return (
    <View testID={`shopping-row-${item.id}`}>
      <Pressable
        onPress={toggle}
        onLongPress={onLongPress}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: bought }}
        accessibilityLabel={[item.name, item.brand, meta, item.note, boughtLine]
          .filter(Boolean)
          .join(', ')}
        accessibilityActions={actions.map((a) => ({ name: a.key, label: a.label }))}
        onAccessibilityAction={(e) =>
          actions.find((a) => a.key === e.nativeEvent.actionName)?.onPress()
        }
        className="min-h-[56px] flex-row items-start gap-3 px-4 py-3 active:bg-accent-soft"
      >
        {/* The whole row ticks; the box only shows the state. */}
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="pt-0.5"
        >
          <Checkbox checked={bought} onCheckedChange={() => {}} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className={cn('text-body-strong', bought && 'text-ink-muted line-through')}>
            {item.name}
          </Text>
          {item.brand ? <Text className="text-caption text-ink-muted">{item.brand}</Text> : null}
          {meta ? <Text className="text-caption tabular-nums text-ink-muted">{meta}</Text> : null}
          {item.note ? <Text className="text-caption text-ink">{item.note}</Text> : null}
          {boughtLine ? <Text className="text-caption text-ink-muted">{boughtLine}</Text> : null}
        </View>
        {item.area ? <AreaTag area={item.area} /> : null}
      </Pressable>
      {onMoveToBuy ? (
        <View className="flex-row pb-2 pl-[50px] pr-4">
          <Button size="sm" variant="ghost" block={false} onPress={onMoveToBuy}>
            {t('shopping.moveToBuy')}
          </Button>
        </View>
      ) : null}
      {item.needsProduct && onAddProduct ? (
        <View className="flex-row items-center gap-3 pb-3 pl-[54px] pr-4">
          <Text className="flex-1 text-caption text-ink">{t('shopping.addToProducts')}</Text>
          <Button
            size="sm"
            variant="secondary"
            block={false}
            onPress={onAddProduct}
            accessibilityLabel={t('shopping.addProductLabel', { name: item.name })}
          >
            {t('shopping.addProduct')}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

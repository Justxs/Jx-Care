import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { categoryGlyph } from '@/components/ui/product-thumb';
import { Text } from '@/components/ui/text';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/cn';

import { dateLine, metaLine, statusBadge } from '../statusText';
import type { ProductListItem } from '../types';

export type ProductTileProps = {
  item: ProductListItem;
  /** Computed from the screen width so two tiles fill a row. */
  width: number;
  onPress: () => void;
  onLongPress?: () => void;
  selecting?: boolean;
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
};

/** Shelf view tile: the bottle by sight (photo, or the category glyph on the area colour). */
export function ProductTile({
  item,
  width,
  onPress,
  onLongPress,
  selecting = false,
  selected = false,
  onSelectedChange,
}: ProductTileProps) {
  const { t } = useTranslation();
  const f = useFormat();
  const badge = statusBadge(item, f, t);
  const date = dateLine(item, f, t);
  const spoken = [item.name, metaLine(item, t), date, badge?.label].filter(Boolean).join(', ');
  return (
    <Pressable
      onPress={selecting ? () => onSelectedChange?.(!selected) : onPress}
      onLongPress={selecting ? undefined : onLongPress}
      accessibilityRole={selecting ? 'checkbox' : 'button'}
      accessibilityState={selecting ? { checked: selected } : undefined}
      accessibilityLabel={spoken}
      testID={`product-tile-${item.id}`}
      style={{ width }}
      className={cn(
        'overflow-hidden rounded-xl bg-surface shadow-card active:opacity-85 dark:border dark:border-border dark:shadow-none',
        selected && 'border-2 border-accent dark:border-accent',
      )}
    >
      <View
        style={{ width, height: width }}
        className={cn(
          'items-center justify-center',
          item.area === 'hair' ? 'bg-hair-soft' : 'bg-skin-soft',
        )}
      >
        {item.photoUri ? (
          <Image
            source={{ uri: item.photoUri }}
            contentFit="cover"
            transition={200}
            style={{ width, height: width }}
          />
        ) : (
          <Icon
            name={categoryGlyph(item.category)}
            size={40}
            tone={item.area === 'hair' ? 'hair' : 'skin'}
          />
        )}
        {selecting ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className="absolute left-2 top-2"
          >
            <Checkbox checked={selected} onCheckedChange={(c) => onSelectedChange?.(c)} />
          </View>
        ) : null}
      </View>
      <View className="gap-1 p-3">
        <Text numberOfLines={2} className="text-body-strong">
          {item.name}
        </Text>
        {date ? (
          <Text numberOfLines={1} className="text-caption text-ink-muted">
            {date}
          </Text>
        ) : null}
        <View className="flex-row flex-wrap gap-1">
          {badge ? <Badge status={badge.status}>{badge.label}</Badge> : null}
          {item.avoid ? <Badge status="avoid" /> : null}
        </View>
      </View>
    </Pressable>
  );
}

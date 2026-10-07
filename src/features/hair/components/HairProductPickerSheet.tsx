import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ProductThumb } from '@/components/ui/product-thumb';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useProductsForPicker } from '@/features/products/api';
import { statusBadge } from '@/features/products/statusText';
import type { PickerProduct } from '@/features/products/types';
import { useFormat } from '@/i18n/useFormat';

export type HairProductPickerSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Product ids picked so far. */
  selected: readonly number[];
  /** The new selection, in the order picked. */
  onPick: (ids: number[]) => void;
};

/**
 * Several Hair or Both products for a wash (R4 in `multiple` mode, cut down): search, then every
 * product by name; expired ones sit under "Can't be picked". Done hands the selection back.
 * Mount it with a new `key` each time it opens so it starts from `selected`.
 */
export function HairProductPickerSheet({
  open,
  onClose,
  selected,
  onPick,
}: HairProductPickerSheetProps) {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<number[]>([...selected]);
  const all = useProductsForPicker({ area: 'hair' }, i18n.language).data ?? [];
  const shown = useProductsForPicker({ area: 'hair', search }, i18n.language).data ?? [];
  const usable = shown.filter((p) => p.status !== 'expired');
  const expired = shown.filter((p) => p.status === 'expired');

  const toggle = (id: number) =>
    setPicked((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('hair.picker.title')}
      footer={
        <Button
          onPress={() => {
            onPick(picked);
            onClose();
          }}
        >
          {t('common.done')}
        </Button>
      }
    >
      {all.length === 0 ? (
        <Text className="py-6 text-center text-body text-ink-muted">{t('hair.picker.none')}</Text>
      ) : (
        <>
          <Input
            accessibilityLabel={t('hair.picker.search')}
            placeholder={t('hair.picker.search')}
            leadingIcon="search"
            value={search}
            onChangeText={setSearch}
            noHelper
          />
          {shown.length === 0 ? (
            <Text className="py-4 text-center text-body text-ink-muted">
              {t('hair.picker.noMatch')}
            </Text>
          ) : null}
          {usable.length > 0 ? (
            <View>
              {usable.map((p) => (
                <PickerRow
                  key={p.id}
                  product={p}
                  checked={picked.includes(p.id)}
                  onToggle={() => toggle(p.id)}
                />
              ))}
            </View>
          ) : null}
          {expired.length > 0 ? (
            <View className="gap-1">
              <Text accessibilityRole="header" className="px-1 text-label text-ink-muted">
                {t('hair.picker.cantPick')}
              </Text>
              <Text className="px-1 text-caption text-ink-muted">
                {t('hair.picker.expiredNote')}
              </Text>
              {expired.map((p) => (
                <PickerRow key={p.id} product={p} checked={false} disabled />
              ))}
            </View>
          ) : null}
        </>
      )}
    </Sheet>
  );
}

function PickerRow({
  product,
  checked,
  onToggle,
  disabled,
}: {
  product: PickerProduct;
  checked: boolean;
  onToggle?: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const badge = statusBadge({ ...product, openedAt: null }, f, t);
  const label = disabled
    ? t('hair.picker.expiredLabel', { name: product.name })
    : [product.name, product.brand, badge?.label].filter(Boolean).join(', ');
  return (
    <Pressable
      onPress={disabled ? undefined : onToggle}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled: !!disabled }}
      className="min-h-[64px] flex-row items-center gap-3 py-2 active:opacity-85"
    >
      <ProductThumb src={product.photoUri} category={product.category} />
      <View className="flex-1 gap-0.5">
        <Text className="text-body">{product.name}</Text>
        {product.brand ? (
          <Text className="text-caption text-ink-muted">{product.brand}</Text>
        ) : null}
      </View>
      {badge ? <Badge status={badge.status}>{badge.label}</Badge> : null}
      {disabled ? null : (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Checkbox checked={checked} onCheckedChange={() => {}} />
        </View>
      )}
    </Pressable>
  );
}

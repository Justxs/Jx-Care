import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { ProductThumb } from '@/components/ui/product-thumb';
import { Separator } from '@/components/ui/separator';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import type { Area } from '@/db/enums';
import { useRecentStepProducts } from '@/features/routines/api';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/cn';

import { useProductsForPicker } from '../api';
import { addProductForPick, useProductAddedForPick } from '../pickReturn';
import { statusBadge } from '../statusText';
import type { PickerProduct } from '../types';

/** `skin` and `hair` include products for both; `any` lists every product. */
export type PickerArea = 'skin' | 'hair' | 'any';

export type ProductPickerSheetProps = {
  open: boolean;
  onClose: () => void;
  area: PickerArea;
  /** Pick several (hair tasks): rows toggle and Done returns the selection. */
  multiple?: boolean;
  selected?: readonly number[];
  /** Single: the picked product's id alone. Multiple: the whole new selection. */
  onPick: (ids: number[]) => void;
  /**
   * "Add new product" is about to open Add product: close any sheet under the picker, which would
   * otherwise float over the form. The new product comes back through `onPick` once saved; call
   * `endAddProductForPick()` when the screen is focused again (back from the form).
   */
  onAddNew?: () => void;
};

const fitsArea = (productArea: Area, area: PickerArea) =>
  area === 'any' || productArea === area || productArea === 'both';

const usable = (p: PickerProduct) => p.status !== 'expired';

/** Recent group, then all products, then the expired ones that can't be picked. */
export function pickerGroups(
  all: readonly PickerProduct[],
  recent: readonly PickerProduct[],
  searching: boolean,
) {
  return {
    recent: searching ? [] : recent.filter(usable).slice(0, 5),
    all: all.filter(usable),
    expired: all.filter((p) => !usable(p)),
  };
}

/** R4 product picker: search, Recent, every product by name, and "Can't be picked". */
export function ProductPickerSheet({
  open,
  onClose,
  area,
  multiple = false,
  selected = [],
  onPick,
  onAddNew,
}: ProductPickerSheetProps) {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<number[]>([...selected]);
  const [token, setToken] = useState<number | null>(null);
  const [wasOpen, setWasOpen] = useState(open);

  // Each time it opens: clear the search and start from the caller's selection.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSearch('');
      setDraft([...selected]);
    }
  }

  const query = search.trim();
  const products = useProductsForPicker(
    { area: area === 'any' ? 'all' : area, search: query },
    i18n.language,
  ).data;
  const recentSkin = useRecentStepProducts('skin').data;
  const recentHair = useRecentStepProducts('hair').data;
  const recent =
    area === 'skin'
      ? (recentSkin ?? [])
      : area === 'hair'
        ? (recentHair ?? [])
        : uniqueById([...(recentSkin ?? []), ...(recentHair ?? [])]);
  const groups = pickerGroups(products ?? [], recent, query !== '');

  useProductAddedForPick(token, (product) => {
    setToken(null);
    if (!fitsArea(product.area, area)) return;
    onPick(multiple ? [...new Set([...draft, product.id])] : [product.id]);
  });

  const toggle = (id: number) => {
    if (!multiple) {
      onPick([id]);
      onClose();
      return;
    }
    setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  };

  const addNew = () => {
    onClose();
    onAddNew?.();
    setToken(addProductForPick(area === 'any' ? null : area));
  };

  const addButton = (
    <Button variant={multiple ? 'ghost' : 'secondary'} icon="plus" onPress={addNew}>
      {t('routines.picker.addNew')}
    </Button>
  );

  const rows = (items: readonly PickerProduct[]) => (
    <View className="overflow-hidden rounded-xl bg-surface shadow-card dark:border dark:border-border dark:shadow-none">
      {items.map((p, i) => (
        <View key={p.id}>
          {i > 0 ? <Separator className="ml-[76px]" /> : null}
          <PickerRow
            product={p}
            multiple={multiple}
            selected={(multiple ? draft : selected).includes(p.id)}
            onPress={() => toggle(p.id)}
          />
        </View>
      ))}
    </View>
  );

  const nothing = products !== undefined && groups.all.length === 0 && groups.expired.length === 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={multiple ? t('routines.picker.titleMultiple') : t('routines.picker.title')}
      footer={
        multiple ? (
          <View className="gap-2">
            <Button
              onPress={() => {
                onPick(draft);
                onClose();
              }}
            >
              {t('common.done')}
            </Button>
            {addButton}
          </View>
        ) : (
          addButton
        )
      }
    >
      <Input
        value={search}
        onChangeText={setSearch}
        placeholder={t('routines.picker.search')}
        accessibilityLabel={t('routines.picker.search')}
        leadingIcon="search"
        autoCorrect={false}
        returnKeyType="search"
        noHelper
      />
      {nothing ? (
        <Text className="px-1 text-body text-ink-muted">
          {query ? t('routines.picker.noMatch') : t('routines.picker.empty')}
        </Text>
      ) : null}
      {groups.recent.length > 0 ? (
        <Group testID="picker-group-recent" title={t('routines.picker.recent')}>
          {rows(groups.recent)}
        </Group>
      ) : null}
      {groups.all.length > 0 ? (
        <Group testID="picker-group-all" title={t('routines.picker.all')}>
          {rows(groups.all)}
        </Group>
      ) : null}
      {groups.expired.length > 0 ? (
        <Group
          testID="picker-group-expired"
          title={t('routines.picker.cantPick')}
          note={t('routines.picker.expiredNote')}
        >
          <View className="overflow-hidden rounded-xl bg-surface shadow-card dark:border dark:border-border dark:shadow-none">
            {groups.expired.map((p, i) => (
              <View key={p.id}>
                {i > 0 ? <Separator className="ml-[76px]" /> : null}
                <PickerRow product={p} multiple={multiple} selected={false} disabled />
              </View>
            ))}
          </View>
        </Group>
      ) : null}
    </Sheet>
  );
}

function uniqueById(items: readonly PickerProduct[]): PickerProduct[] {
  const seen = new Set<number>();
  return items.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

function Group({
  title,
  note,
  testID,
  children,
}: {
  title: string;
  note?: string;
  testID?: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-2" testID={testID}>
      <View className="gap-0.5 px-1">
        <Text accessibilityRole="header" className="text-label text-ink-muted">
          {title}
        </Text>
        {note ? <Text className="text-caption text-ink-muted">{note}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function PickerRow({
  product,
  multiple,
  selected,
  disabled = false,
  onPress,
}: {
  product: PickerProduct;
  multiple: boolean;
  selected: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const badge = statusBadge({ ...product, openedAt: null }, f, t);
  const spoken = [
    product.name,
    product.brand,
    badge?.label,
    disabled ? t('routines.picker.expiredNote') : null,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={multiple ? 'checkbox' : 'button'}
      accessibilityLabel={spoken}
      accessibilityState={multiple ? { checked: selected, disabled } : { selected, disabled }}
      testID={`picker-row-${product.id}`}
      className={cn(
        'min-h-[72px] flex-row items-center gap-3 px-4 py-3',
        !disabled && 'active:bg-subtle',
      )}
    >
      <ProductThumb src={product.photoUri} category={product.category} />
      <View className="flex-1 gap-0.5">
        <Text className="text-body-strong">{product.name}</Text>
        {product.brand ? (
          <Text numberOfLines={1} className="text-caption text-ink-muted">
            {product.brand}
          </Text>
        ) : null}
      </View>
      {badge ? <Badge status={badge.status}>{badge.label}</Badge> : null}
      {multiple && !disabled ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Checkbox checked={selected} onCheckedChange={() => onPress?.()} />
        </View>
      ) : selected ? (
        <Icon name="check" size={20} tone="accent" />
      ) : null}
    </Pressable>
  );
}

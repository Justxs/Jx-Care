import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip';
import { RadioList } from '@/components/ui/radio-list';
import { Sheet } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { ToggleGroup } from '@/components/ui/toggle-group';
import { productCategories, type ProductCategory } from '@/db/enums';
import type { ExpiryStatus } from '@/lib/expiry';

import { useProducts } from '../api';
import { categoryLabel } from '../statusText';
import { defaultProductFilters, type ProductFilters, type ProductSort } from '../types';

const STATUS_ORDER: ExpiryStatus[] = ['ok', 'expiring', 'expired', 'unopened', 'nodate'];

export type ProductFiltersSheetProps = {
  open: boolean;
  onClose: () => void;
  /** The filters in use; the sheet edits a copy until "Show N products". */
  value: ProductFilters;
  onApply: (filters: ProductFilters) => void;
  locale?: string;
};

/**
 * Filters and sort for the Products list. Mount it with a new `key` each time it opens so the
 * draft starts from the filters in use.
 */
export function ProductFiltersSheet({
  open,
  onClose,
  value,
  onApply,
  locale,
}: ProductFiltersSheetProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);
  const count = useProducts(draft, locale).data?.length ?? 0;
  const set = (patch: Partial<ProductFilters>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('products.filters')}
      footer={
        <View className="flex-row gap-2">
          <Button
            variant="ghost"
            block={false}
            onPress={() => setDraft({ ...defaultProductFilters, sort: draft.sort })}
          >
            {t('products.resetFilters')}
          </Button>
          <Button
            className="flex-1"
            onPress={() => {
              onApply(draft);
              onClose();
            }}
          >
            {t('products.show', { count })}
          </Button>
        </View>
      }
    >
      <Group label={t('products.area')}>
        <ToggleGroup
          accessibilityLabel={t('products.area')}
          value={draft.area}
          onValueChange={(area) => set({ area: area as ProductFilters['area'] })}
          items={[
            { value: 'all', label: t('products.all') },
            { value: 'skin', label: t('common.skin') },
            { value: 'hair', label: t('common.hair') },
          ]}
        />
      </Group>
      <Group label={t('products.category')}>
        <ChipGroup
          accessibilityLabel={t('products.category')}
          value={draft.categories}
          onValueChange={(v) => set({ categories: v as ProductCategory[] })}
          items={productCategories.map((c) => ({ value: c, label: categoryLabel(c, t) }))}
        />
      </Group>
      <Group label={t('products.status')}>
        <ChipGroup
          accessibilityLabel={t('products.status')}
          value={draft.statuses}
          onValueChange={(v) => set({ statuses: v as ExpiryStatus[] })}
          items={STATUS_ORDER.map((s) => ({ value: s, label: t(`common.status.${s}`) }))}
        />
      </Group>
      <View className="min-h-[48px] flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-body">{t('products.avoidOnly')}</Text>
        <Switch
          checked={draft.avoidOnly}
          onCheckedChange={(avoidOnly) => set({ avoidOnly })}
          accessibilityLabel={t('products.avoidOnly')}
        />
      </View>
      <Group label={t('products.sort')}>
        <RadioList
          accessibilityLabel={t('products.sort')}
          value={draft.sort}
          onValueChange={(sort) => set({ sort: sort as ProductSort })}
          items={[
            { value: 'expiry', label: t('products.sortExpiry') },
            { value: 'name', label: t('products.sortName') },
            { value: 'recent', label: t('products.sortRecent') },
          ]}
        />
      </Group>
    </Sheet>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text accessibilityRole="header" className="text-overline text-ink-muted">
        {label}
      </Text>
      {children}
    </View>
  );
}

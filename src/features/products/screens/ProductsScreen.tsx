import { useSelector } from '@tanstack/react-store';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB_LIST_END_SPACE, Fab } from '@/components/ui/fab';
import { Icon, type IconName } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { ToggleGroup } from '@/components/ui/toggle-group';
import type { ProductView } from '@/db/enums';
import { useSettings, useUpdateSettings } from '@/features/settings/api';
import { useToBuyCount } from '@/features/shopping/api';
import { useBuyAgain, type BuyAgain } from '@/features/shopping/buyAgain';
import { ShoppingScreen, ShoppingShareButton } from '@/features/shopping/screens/ShoppingScreen';
import { cn } from '@/lib/cn';
import { showToast } from '@/state/ui';
import { motion } from '@/theme/motion';
import { rowEntering, rowExiting, rowLayout } from '@/theme/listMotion';

import { useArchiveCount, useDuplicateProduct, useMarkOpened, useProducts } from '../api';
import { useFinishProducts } from '../archiveActions';
import { ProductFiltersSheet } from '../components/ProductFiltersSheet';
import { ProductRow, type RowAction } from '../components/ProductRow';
import { ProductTile } from '../components/ProductTile';
import {
  activeFilterCount,
  productListStore,
  productsSegmentStore,
  resetProductFilters,
  setProductFilters,
  setProductsSegment,
  type ProductsSegment,
} from '../listState';
import type { ProductListItem } from '../types';

const SEARCH_DEBOUNCE_MS = 150;
const SELECTION_BAR_SPACE = 88;

/** P1 Products: My products (list or shelf) and Shopping (P6). */
export function ProductsScreen() {
  const { t } = useTranslation();
  const segment = useSelector(productsSegmentStore, (s) => s.segment);
  const toBuy = useToBuyCount().data ?? 0;
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const count = useProductsCount();

  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <View className="min-h-[56px] flex-row items-center justify-between pl-4 pr-2">
        <Text accessibilityRole="header" className="text-title-l">
          {t('products.title')}
        </Text>
        {segment === 'mine' ? (
          <Pressable
            onPress={selecting ? stopSelecting : () => setSelecting(true)}
            disabled={!selecting && count === 0}
            accessibilityRole="button"
            accessibilityState={{ disabled: !selecting && count === 0 }}
            hitSlop={4}
            className={cn(
              'min-h-[44px] min-w-[44px] items-center justify-center px-2 active:opacity-85',
              !selecting && count === 0 && 'opacity-45',
            )}
          >
            <Text className="text-body-strong text-accent">
              {selecting ? t('common.done') : t('products.select')}
            </Text>
          </Pressable>
        ) : (
          <ShoppingShareButton />
        )}
      </View>
      <View className="px-4 pb-2">
        <ToggleGroup
          value={segment}
          onValueChange={(v) => {
            stopSelecting();
            setProductsSegment(v as ProductsSegment);
          }}
          items={[
            { value: 'mine', label: t('products.mine') },
            {
              value: 'shopping',
              label: t('products.shopping'),
              count: toBuy > 0 ? toBuy : undefined,
            },
          ]}
        />
      </View>
      <View className="flex-1">
        <Animated.View
          key={segment}
          entering={FadeIn.duration(motion.duration.base)}
          exiting={FadeOut.duration(motion.duration.base)}
          className="absolute inset-0"
        >
          {segment === 'mine' ? (
            <MyProducts
              selecting={selecting}
              selected={selected}
              onSelectedChange={setSelected}
              onSelectStart={(id) => {
                setSelecting(true);
                setSelected(new Set([id]));
              }}
              onSelectDone={stopSelecting}
            />
          ) : (
            <ShoppingScreen />
          )}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

/** Active products with the current filters, for enabling Select. */
function useProductsCount(): number {
  const filters = useSelector(productListStore, (s) => s.filters);
  const { i18n } = useTranslation();
  return useProducts(filters, i18n.language).data?.length ?? 0;
}

type MyProductsProps = {
  selecting: boolean;
  selected: ReadonlySet<number>;
  onSelectedChange: (ids: ReadonlySet<number>) => void;
  onSelectStart: (id: number) => void;
  onSelectDone: () => void;
};

function MyProducts({
  selecting,
  selected,
  onSelectedChange,
  onSelectStart,
  onSelectDone,
}: MyProductsProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const filters = useSelector(productListStore, (s) => s.filters);
  const [search, setSearch] = useState(filters.search);
  const [sheetKey, setSheetKey] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const products = useProducts(filters, locale);
  const archiveCount = useArchiveCount().data ?? 0;
  const view: ProductView = useSettings().data?.productView ?? 'list';
  const updateSettings = useUpdateSettings();
  const buyAgain = useBuyAgain();
  const finish = useFinishProducts();
  const actions = useRowActions(buyAgain, finish.run);
  const filterCount = activeFilterCount(filters);

  useEffect(() => {
    const id = setTimeout(() => {
      const current = productListStore.state.filters;
      if (current.search !== search) setProductFilters({ ...current, search });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  const items = products.data ?? [];
  const isFiltered = filterCount > 0 || filters.search.trim() !== '';
  const toggle = (id: number, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    onSelectedChange(next);
  };
  const selectedItems = items.filter((p) => selected.has(p.id));

  const finishSelected = async () => {
    await finish.run(selectedItems.map((p) => ({ id: p.id, name: p.name })));
    onSelectDone();
  };

  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-1 px-4 pb-2">
        <Input
          className="flex-1"
          noHelper
          leadingIcon="search"
          value={search}
          onChangeText={setSearch}
          placeholder={t('products.search')}
          accessibilityLabel={t('products.search')}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        <IconButton
          icon={view === 'list' ? 'layout-grid' : 'list'}
          label={view === 'list' ? t('products.shelfView') : t('products.listView')}
          onPress={() => updateSettings.mutate({ productView: view === 'list' ? 'shelf' : 'list' })}
        />
        <IconButton
          icon="sliders"
          label={
            filterCount > 0
              ? t('products.filtersOn', { count: filterCount })
              : t('products.filters')
          }
          count={filterCount}
          onPress={() => {
            setSheetKey((k) => k + 1);
            setSheetOpen(true);
          }}
        />
      </View>

      <ScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          gap: 16,
          paddingBottom: FAB_LIST_END_SPACE + (selecting ? SELECTION_BAR_SPACE : 0),
        }}
      >
        {products.isPending ? (
          <SkeletonRows />
        ) : (
          <Animated.View entering={FadeIn.duration(motion.duration.fast)} className="gap-4">
            {items.length === 0 ? (
              isFiltered ? (
                <EmptyState
                  icon="search"
                  title={t('products.noMatchTitle')}
                  secondaryLabel={t('products.resetFilters')}
                  onSecondary={() => {
                    setSearch('');
                    resetProductFilters();
                  }}
                >
                  {t('products.noMatchBody')}
                </EmptyState>
              ) : (
                <EmptyState
                  icon="package"
                  title={t('products.emptyTitle')}
                  actionLabel={t('products.add')}
                  actionIcon="plus"
                  onAction={() => router.push('/product-form')}
                >
                  {t('products.emptyBody')}
                </EmptyState>
              )
            ) : view === 'list' ? (
              <LayoutAnimationConfig skipEntering>
                <Animated.View layout={rowLayout}>
                  <Card flush>
                    {items.map((item, index) => (
                      <Animated.View
                        key={item.id}
                        entering={rowEntering}
                        exiting={rowExiting}
                        layout={rowLayout}
                      >
                        {index > 0 ? <Separator inset /> : null}
                        <ProductRow
                          item={item}
                          onPress={() => router.push(`/products/${item.id}`)}
                          actions={actions(item)}
                          selecting={selecting}
                          selected={selected.has(item.id)}
                          onSelectedChange={(on) => toggle(item.id, on)}
                        />
                      </Animated.View>
                    ))}
                  </Card>
                </Animated.View>
              </LayoutAnimationConfig>
            ) : (
              <Shelf
                items={items}
                selecting={selecting}
                selected={selected}
                onToggle={toggle}
                onLongPress={onSelectStart}
              />
            )}
            {archiveCount > 0 ? (
              <Pressable
                onPress={() => router.push('/products/archive')}
                accessibilityRole="link"
                className="min-h-[44px] items-center justify-center self-center px-4 active:opacity-85"
              >
                <Text className="text-body-strong text-accent">
                  {t('products.archiveLink', { count: archiveCount })}
                </Text>
              </Pressable>
            ) : null}
          </Animated.View>
        )}
      </ScrollView>

      {selecting ? (
        <Animated.View
          entering={FadeIn.duration(motion.duration.base)}
          exiting={FadeOut.duration(motion.duration.fast)}
          testID="selection-bar"
          className="absolute bottom-0 left-0 right-0 gap-2 border-t border-border bg-canvas px-4 py-3"
        >
          <Text className="text-label text-ink-muted">
            {t('products.selected', { count: selectedItems.length })}
          </Text>
          <View className="flex-row gap-2">
            <Button
              className="flex-1"
              icon="archive"
              disabled={selectedItems.length === 0}
              loading={finish.isPending}
              onPress={finishSelected}
            >
              {t('common.markFinished')}
            </Button>
            {buyAgain ? (
              <Button
                className="flex-1"
                variant="secondary"
                icon="shopping-cart"
                disabled={selectedItems.length === 0}
                onPress={() => {
                  buyAgain(selectedItems.map((p) => ({ id: p.id, name: p.name })));
                  onSelectDone();
                }}
              >
                {t('common.buyAgain')}
              </Button>
            ) : null}
          </View>
        </Animated.View>
      ) : (
        <Animated.View
          entering={FadeIn.duration(motion.duration.base)}
          exiting={FadeOut.duration(motion.duration.fast)}
          className="absolute bottom-4 right-4"
        >
          <Fab className="static" onPress={() => router.push('/product-form')}>
            {t('products.add')}
          </Fab>
        </Animated.View>
      )}

      <ProductFiltersSheet
        key={sheetKey}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        value={filters}
        onApply={setProductFilters}
        locale={locale}
      />
    </View>
  );
}

/** Swipe and long-press actions for one row. */
function useRowActions(
  buyAgain: BuyAgain | null,
  finish: (products: { id: number; name: string }[]) => Promise<void>,
) {
  const { t } = useTranslation();
  const markOpened = useMarkOpened();
  const duplicate = useDuplicateProduct();

  return (item: ProductListItem): RowAction[] => {
    const list: RowAction[] = [];
    if (!item.openedAt) {
      list.push({
        key: 'markOpened',
        label: t('products.markOpened'),
        icon: 'package-open',
        onPress: () => markOpened.mutate(item.id),
      });
    }
    list.push({
      key: 'markFinished',
      label: t('common.markFinished'),
      icon: 'archive',
      primary: true,
      onPress: () => void finish([{ id: item.id, name: item.name }]),
    });
    if (buyAgain) {
      list.push({
        key: 'buyAgain',
        label: t('common.buyAgain'),
        icon: 'shopping-cart',
        onPress: () => buyAgain([{ id: item.id, name: item.name }]),
      });
    }
    list.push({
      key: 'duplicate',
      label: t('products.duplicate'),
      icon: 'copy',
      onPress: async () => {
        await duplicate.mutateAsync(item.id);
        showToast({ message: t('products.duplicatedToast', { name: item.name }) });
      },
    });
    return list;
  };
}

function Shelf({
  items,
  selecting,
  selected,
  onToggle,
  onLongPress,
}: {
  items: ProductListItem[];
  selecting: boolean;
  selected: ReadonlySet<number>;
  onToggle: (id: number, on: boolean) => void;
  onLongPress: (id: number) => void;
}) {
  const { width } = useWindowDimensions();
  // Two columns inside the 16 pt gutters with a 12 pt gap.
  const tileWidth = Math.floor((width - 32 - 12) / 2);
  return (
    <View className="flex-row flex-wrap gap-3">
      {items.map((item) => (
        <Animated.View key={item.id} exiting={rowExiting} layout={rowLayout}>
          <ProductTile
            item={item}
            width={tileWidth}
            onPress={() => router.push(`/products/${item.id}`)}
            onLongPress={() => onLongPress(item.id)}
            selecting={selecting}
            selected={selected.has(item.id)}
            onSelectedChange={(on) => onToggle(item.id, on)}
          />
        </Animated.View>
      ))}
    </View>
  );
}

function SkeletonRows() {
  return (
    <Card flush>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i}>
          {i > 0 ? <Separator inset /> : null}
          <View className="min-h-[72px] flex-row items-center gap-3 px-4 py-3">
            <Skeleton width={48} height={48} radius={8} />
            <View className="flex-1 gap-2">
              <Skeleton width="60%" height={16} />
              <Skeleton width="40%" height={12} />
            </View>
          </View>
        </View>
      ))}
    </Card>
  );
}

function IconButton({
  icon,
  label,
  count = 0,
  onPress,
}: {
  icon: IconName;
  label: string;
  count?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-[48px] w-[44px] items-center justify-center rounded-full active:opacity-85"
    >
      <Icon name={icon} size={22} tone="ink" />
      {count > 0 ? (
        <View className="absolute right-0.5 top-1.5 h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1">
          <Text className="text-tiny-strong tabular-nums text-on-accent">{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

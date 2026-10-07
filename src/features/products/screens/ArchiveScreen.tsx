import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, LayoutAnimationConfig } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { ProductThumb } from '@/components/ui/product-thumb';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Separator } from '@/components/ui/separator';
import { Sheet } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { ToggleGroup } from '@/components/ui/toggle-group';
import { useBuyAgain } from '@/features/shopping/buyAgain';
import { useFormat } from '@/i18n/useFormat';
import { motion } from '@/theme/motion';
import { rowEntering, rowExiting, rowLayout } from '@/theme/listMotion';

import { useArchivedProducts, useDeleteProduct } from '../api';
import { useRestoreFromArchive } from '../archiveActions';
import type { ArchiveSort, ArchivedProduct } from '../types';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/products'));

/** P5 Archive: finished products with their cost per day; restore or delete them for good. */
export function ArchiveScreen() {
  const { t } = useTranslation();
  const [sort, setSort] = useState<ArchiveSort>('date');
  const archived = useArchivedProducts(sort);
  const buyAgain = useBuyAgain();
  const restore = useRestoreFromArchive();
  const remove = useDeleteProduct();
  // The row whose action sheet is open (kept while it slides away).
  const [menuItem, setMenuItem] = useState<ArchivedProduct | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuKey, setMenuKey] = useState(0);
  const [deleteItem, setDeleteItem] = useState<ArchivedProduct | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const items = archived.data ?? [];

  const openMenu = (item: ArchivedProduct) => {
    setMenuItem(item);
    setMenuKey((k) => k + 1);
    setMenuOpen(true);
  };

  const restoreItem = (item: ArchivedProduct) => {
    setMenuOpen(false);
    void restore.run(item);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScreenHeader title={t('products.archive.title')} onBack={goBack} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        {archived.isPending || items.length > 0 ? (
          <ToggleGroup
            accessibilityLabel={t('products.archive.sort')}
            value={sort}
            onValueChange={(v) => setSort(v as ArchiveSort)}
            items={[
              { value: 'date', label: t('products.archive.sortDate') },
              { value: 'cost', label: t('products.archive.sortCost') },
            ]}
          />
        ) : null}
        {archived.isPending ? (
          <SkeletonRows />
        ) : items.length === 0 ? (
          <Animated.View entering={FadeIn.duration(motion.duration.fast)}>
            <EmptyState icon="archive" title={t('products.archive.emptyTitle')}>
              {t('products.archive.emptyBody')}
            </EmptyState>
          </Animated.View>
        ) : (
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
                    <ArchiveRow item={item} onMore={() => openMenu(item)} />
                  </Animated.View>
                ))}
              </Card>
            </Animated.View>
          </LayoutAnimationConfig>
        )}
      </ScrollView>

      {menuItem ? (
        <Sheet
          key={menuKey}
          open={menuOpen}
          onClose={() => {
            setMenuOpen(false);
            setMenuItem(null);
          }}
          title={menuItem.name}
        >
          <View className="-mx-4">
            <ListRow
              label={t('products.archive.restore')}
              icon="rotate-ccw"
              trailing="none"
              onPress={() => restoreItem(menuItem)}
            />
            {buyAgain ? (
              <ListRow
                label={t('common.buyAgain')}
                icon="shopping-cart"
                trailing="none"
                onPress={() => {
                  setMenuOpen(false);
                  buyAgain([{ id: menuItem.id, name: menuItem.name }]);
                }}
              />
            ) : null}
            <ListRow
              label={t('common.delete')}
              icon="trash-2"
              tone="danger"
              trailing="none"
              onPress={() => {
                setMenuOpen(false);
                setDeleteItem(menuItem);
                setDeleteOpen(true);
              }}
            />
          </View>
        </Sheet>
      ) : null}

      <AlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('products.archive.deleteTitle', { name: deleteItem?.name ?? '' })}
        description={t('products.archive.deleteBody')}
        actionLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onAction={() => {
          setDeleteOpen(false);
          if (deleteItem) remove.mutate(deleteItem.id);
        }}
      />
    </SafeAreaView>
  );
}

function ArchiveRow({ item, onMore }: { item: ArchivedProduct; onMore: () => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const finished = t('products.archive.finishedOn', { date: f.date(item.archivedAt) });
  const cost = item.costPerDay
    ? t('products.archive.costPerDay', { cost: f.money(item.costPerDay.cents) })
    : null;
  return (
    <View
      testID={`archive-row-${item.id}`}
      className="min-h-[72px] flex-row items-center bg-surface"
    >
      <Pressable
        onPress={() => router.push(`/products/${item.id}`)}
        accessibilityRole="button"
        accessibilityLabel={[item.name, finished, cost].filter(Boolean).join(', ')}
        className="flex-1 flex-row items-center gap-3 py-3 pl-4 active:bg-subtle"
      >
        <ProductThumb src={item.photoUri} category={item.category} />
        <View className="flex-1 gap-0.5">
          <Text className="text-body-strong">{item.name}</Text>
          <Text className="text-caption tabular-nums text-ink-muted">{finished}</Text>
          {cost ? <Text className="text-caption tabular-nums text-ink">{cost}</Text> : null}
        </View>
      </Pressable>
      <Pressable
        onPress={onMore}
        accessibilityRole="button"
        accessibilityLabel={t('a11y.moreActions')}
        className="mr-1 h-[44px] w-[44px] items-center justify-center rounded-full active:opacity-85"
      >
        <Icon name="ellipsis" size={22} tone="ink-muted" />
      </Pressable>
    </View>
  );
}

function SkeletonRows() {
  return (
    <Card flush>
      {[0, 1, 2, 3].map((i) => (
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

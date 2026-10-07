import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB_LIST_END_SPACE, Fab } from '@/components/ui/fab';
import { Icon } from '@/components/ui/icon';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { ProductRow } from '@/features/products/components/ProductRow';
import { cn } from '@/lib/cn';
import { showToast } from '@/state/ui';
import { motion } from '@/theme/motion';
import { rowEntering, rowLayout } from '@/theme/listMotion';

import {
  useAvoidedProducts,
  useAvoidItems,
  useRemoveAvoidItem,
  useRestoreAvoidItem,
} from '../avoidApi';
import type { AvoidListItem } from '../avoidRepo';
import { AddAvoidSheet } from '../components/AddAvoidSheet';
import { SideName, useSideLabel } from '../components/SidePicker';

const NO_ITEMS: readonly AvoidListItem[] = [];

/** A removed row fades while its neighbours close the gap (200 ms). */
const rowRemoved = FadeOut.duration(motion.duration.base);

/**
 * S4 Avoid list: ingredients and groups to avoid, with a note and how many products contain each,
 * then those products. × removes a row with Undo; Add ingredient (Fab) opens the picker.
 */
export function AvoidListScreen() {
  const { t } = useTranslation();
  const items = useAvoidItems();
  const products = useAvoidedProducts();
  const remove = useRemoveAvoidItem();
  const restore = useRestoreAvoidItem();
  const [sheet, setSheet] = useState({ key: 0, open: false });
  const list = items.data ?? NO_ITEMS;
  const empty = !items.isPending && list.length === 0;

  const openSheet = () => setSheet((s) => ({ key: s.key + 1, open: true }));

  const onRemove = async (item: AvoidListItem) => {
    const row = await remove.mutateAsync(item.id);
    if (!row) return;
    showToast({
      message: t('avoid.removed', { name: item.name }),
      actionLabel: t('common.undo'),
      onAction: () => restore.mutate(row),
    });
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScreenHeader title={t('screens.avoid')} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: FAB_LIST_END_SPACE,
          gap: 24,
        }}
      >
        {items.isPending ? (
          <SkeletonRows />
        ) : empty ? (
          <EmptyState
            icon="ban"
            title={t('avoid.emptyTitle')}
            actionLabel={t('avoid.add')}
            actionIcon="plus"
            onAction={openSheet}
          >
            {t('avoid.emptyBody')}
          </EmptyState>
        ) : (
          <Animated.View entering={FadeIn.duration(motion.duration.fast)} className="gap-6">
            <LayoutAnimationConfig skipEntering>
              <Animated.View layout={rowLayout}>
                <Card flush>
                  {list.map((item, index) => (
                    <Animated.View
                      key={item.id}
                      entering={rowEntering}
                      exiting={rowRemoved}
                      layout={rowLayout}
                    >
                      {index > 0 ? <Separator className="ml-4" /> : null}
                      <AvoidRow item={item} onRemove={() => onRemove(item)} />
                    </Animated.View>
                  ))}
                </Card>
              </Animated.View>
            </LayoutAnimationConfig>

            <Animated.View layout={rowLayout} className="gap-2">
              <Text accessibilityRole="header" className="px-1 text-title-s">
                {t('avoid.productsTitle')}
              </Text>
              {(products.data ?? []).length > 0 ? (
                <Card flush>
                  {(products.data ?? []).map((p, i) => (
                    <View key={p.id}>
                      {i > 0 ? <Separator inset /> : null}
                      <ProductRow item={p} onPress={() => router.push(`/products/${p.id}`)} />
                    </View>
                  ))}
                </Card>
              ) : (
                <Text className="min-h-[24px] px-1 text-body text-ink-muted">
                  {products.isPending ? '' : t('avoid.noProducts')}
                </Text>
              )}
            </Animated.View>
          </Animated.View>
        )}
      </ScrollView>

      {/* The empty state carries Add ingredient; one filled button per screen. */}
      {items.isPending || empty ? null : <Fab onPress={openSheet}>{t('avoid.add')}</Fab>}

      <AddAvoidSheet
        key={sheet.key}
        open={sheet.open}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        listed={list}
      />
    </SafeAreaView>
  );
}

function AvoidRow({ item, onRemove }: { item: AvoidListItem; onRemove: () => void }) {
  const { t } = useTranslation();
  const spoken = useSideLabel();
  const inProducts = item.productCount > 0;
  const count = inProducts
    ? t('avoid.inProducts', { count: item.productCount })
    : t('avoid.inNoProducts');
  return (
    <View
      testID={`avoid-row-${item.id}`}
      className="min-h-[72px] flex-row items-center gap-2 py-3 pl-4 pr-1"
    >
      <View
        accessible
        accessibilityLabel={[spoken(item), item.note, count].filter(Boolean).join(', ')}
        className="flex-1 gap-1"
      >
        <SideName side={item} />
        {item.note ? <Text className="text-caption text-ink-muted">{item.note}</Text> : null}
        <Text
          className={cn('text-caption tabular-nums', inProducts ? 'text-danger' : 'text-ink-muted')}
        >
          {count}
        </Text>
      </View>
      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={t('avoid.remove', { name: spoken(item) })}
        className="h-[44px] w-[44px] items-center justify-center rounded-full active:bg-subtle"
      >
        <Icon name="x" size={20} tone="ink-muted" />
      </Pressable>
    </View>
  );
}

function SkeletonRows() {
  return (
    <Card flush>
      {[0, 1, 2].map((i) => (
        <View key={i}>
          {i > 0 ? <Separator className="ml-4" /> : null}
          <View className="min-h-[72px] justify-center gap-2 px-4 py-3">
            <Skeleton width="45%" height={16} />
            <Skeleton width="30%" height={12} />
          </View>
        </View>
      ))}
    </Card>
  );
}

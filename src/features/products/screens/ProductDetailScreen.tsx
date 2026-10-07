import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { AreaTag } from '@/components/ui/area-tag';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import type { MoreMenuItem } from '@/components/ui/more-menu';
import { categoryGlyph } from '@/components/ui/product-thumb';
import { Progress } from '@/components/ui/progress';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBuyAgain } from '@/features/shopping/buyAgain';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/cn';
import { expiryProgress } from '@/lib/expiry';
import { setToastInset, showToast, uiStore } from '@/state/ui';
import { motion } from '@/theme/motion';

import {
  useAvoidContext,
  useDeleteProduct,
  useDuplicateProduct,
  useKnownIngredients,
  useMarkFinished,
  useMarkOpened,
  useProduct,
  useRestoreProduct,
  useUndoFinished,
  useUpdateProduct,
} from '../api';
import { IngredientEntrySheet } from '../components/IngredientEntrySheet';
import { IngredientPills } from '../components/IngredientPills';
import { PhotoViewer } from '../components/PhotoViewer';
import { detailBadge, expiryLine, ingredientPills, sizeText, withIngredients } from '../detail';
import { categoryLabel } from '../statusText';
import type { ProductDetail, UsedIn } from '../types';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/products'));

/** P2 Product detail, opened from the list, Today or an expiry reminder (`/products/[id]`). */
export function ProductDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  // A malformed id (an old link) reads as a deleted product.
  const product = useProduct(Number.isInteger(productId) && productId > 0 ? productId : -1);

  if (product.isPending) {
    return (
      <Frame title={t('products.detail.title')}>
        <DetailSkeleton />
      </Frame>
    );
  }
  if (!product.data) {
    return (
      <Frame title={t('products.detail.title')}>
        <EmptyState
          icon="package"
          title={t('products.detail.missingTitle')}
          actionLabel={t('common.back')}
          onAction={goBack}
        />
      </Frame>
    );
  }
  return <Detail product={product.data} />;
}

function Frame({
  title,
  menu,
  children,
}: {
  title: string;
  menu?: readonly MoreMenuItem[];
  children: ReactNode;
}) {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScreenHeader
        title={title}
        onBack={goBack}
        action={menu && menu.length > 0 ? { menu } : undefined}
      />
      {children}
    </SafeAreaView>
  );
}

function Detail({ product: p }: { product: ProductDetail }) {
  const { t } = useTranslation();
  const f = useFormat();
  const buyAgain = useBuyAgain();
  const markOpened = useMarkOpened();
  const markFinished = useMarkFinished();
  const undoFinished = useUndoFinished();
  const restore = useRestoreProduct();
  const remove = useDeleteProduct();
  const duplicate = useDuplicateProduct();
  const update = useUpdateProduct();
  const known = useKnownIngredients().data ?? [];
  const avoid = useAvoidContext().data;
  const [viewerOpen, setViewerOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [ingredientsKey, setIngredientsKey] = useState(0);
  const [barHeight, setBarHeight] = useState(0);
  const archived = p.archivedAt !== null;

  // Toasts float above the action bar while this screen is in front, not over its buttons.
  useFocusEffect(
    useCallback(() => {
      if (barHeight === 0) return;
      const base = uiStore.state.toastInset;
      setToastInset(base + barHeight);
      return () => setToastInset(base);
    }, [barHeight]),
  );

  const menu: MoreMenuItem[] = [];
  if (!archived && !p.openedAt) {
    menu.push({
      label: t('products.markOpened'),
      icon: 'package-open',
      onPress: () => markOpened.mutate(p.id),
    });
  }
  menu.push({
    label: t('products.duplicate'),
    icon: 'copy',
    onPress: async () => {
      const copyId = await duplicate.mutateAsync(p.id);
      showToast({ message: t('products.duplicatedToast', { name: p.name }) });
      router.push(`/products/${copyId}`);
    },
  });
  if (archived) {
    menu.push({
      label: t('common.delete'),
      icon: 'trash-2',
      destructive: true,
      onPress: () => setDeleteOpen(true),
    });
  }

  const finish = async () => {
    const { previous } = await markFinished.mutateAsync(p.id);
    showToast({
      message: t('products.finishedToast', { name: p.name }),
      actionLabel: t('common.undo'),
      onAction: () => undoFinished.mutate([{ id: p.id, archivedAt: previous }]),
      ...(buyAgain
        ? {
            secondaryLabel: t('common.buyAgain'),
            onSecondary: () => buyAgain([{ id: p.id, name: p.name }]),
          }
        : {}),
    });
    goBack();
  };

  const restoreProduct = async () => {
    const previous = p.archivedAt;
    await restore.mutateAsync(p.id);
    showToast({
      message: t('products.archive.restoredToast', { name: p.name }),
      actionLabel: t('common.undo'),
      onAction: () => undoFinished.mutate([{ id: p.id, archivedAt: previous }]),
    });
  };

  return (
    <Frame title={t('products.detail.title')} menu={menu}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 32 }}>
        <Animated.View entering={FadeIn.duration(motion.duration.fast)} className="gap-6">
          <PhotoBox product={p} onOpen={() => setViewerOpen(true)} />
          <View className="gap-2">
            <Text accessibilityRole="header" className="text-title-m">
              {p.name}
            </Text>
            {p.brand ? <Text className="text-body text-ink-muted">{p.brand}</Text> : null}
            <View className="flex-row flex-wrap items-center gap-2">
              <AreaTag area={p.area} />
              <Text className="text-label text-ink-muted">{categoryLabel(p.category, t)}</Text>
              {p.avoid ? <Badge status="avoid" /> : null}
            </View>
          </View>

          <ExpiryCard product={p} />

          <Card title={t('products.detail.details')}>
            <View className="gap-4">
              <Facts
                rows={[
                  { label: t('products.detail.size'), value: sizeText(p, f, t) },
                  {
                    label: t('products.detail.price'),
                    value: p.priceCents != null ? f.money(p.priceCents) : null,
                  },
                ]}
              />
              <Separator />
              <View className="gap-2">
                <View className="min-h-[44px] flex-row items-center justify-between gap-3">
                  <Text className="text-body-strong">{t('products.detail.ingredients')}</Text>
                  <Pressable
                    onPress={() => {
                      setIngredientsKey((k) => k + 1);
                      setIngredientsOpen(true);
                    }}
                    accessibilityRole="button"
                    hitSlop={4}
                    className="min-h-[44px] justify-center px-1 active:opacity-85"
                  >
                    <Text className="text-body-strong text-accent">
                      {t('products.detail.editList')}
                    </Text>
                  </Pressable>
                </View>
                {p.ingredients.length > 0 ? (
                  // TODO(030): mark ingredients that are in a conflict rule (link icon).
                  <IngredientPills items={ingredientPills(p, avoid?.items ?? [])} />
                ) : (
                  <Text className="text-body text-ink-muted">
                    {t('products.detail.noIngredients')}
                  </Text>
                )}
              </View>
              {p.notes ? (
                <>
                  <Separator />
                  <View className="gap-1">
                    <Text className="text-body-strong">{t('products.detail.notes')}</Text>
                    <Text className="text-body">{p.notes}</Text>
                  </View>
                </>
              ) : null}
            </View>
          </Card>

          {p.usedIn.length > 0 ? <UsedInCard items={p.usedIn} /> : null}

          {/* TODO(039): "My rating" (1–5 stars and Would buy again) goes here. */}
          {/* TODO(039): the notes timeline (dated reaction notes, Add note) goes here. */}

          {archived ? (
            <Card title={t('products.detail.costPerDay')}>
              {p.costPerDay ? (
                <Text className="text-title-s tabular-nums">
                  {t('products.detail.costPerDayOver', {
                    cost: f.money(p.costPerDay.cents),
                    count: p.costPerDay.days,
                  })}
                </Text>
              ) : (
                <Text className="text-body text-ink-muted">{t('products.detail.costMissing')}</Text>
              )}
            </Card>
          ) : null}
        </Animated.View>
      </ScrollView>

      <View
        testID="detail-actions"
        onLayout={(e) => setBarHeight(Math.round(e.nativeEvent.layout.height))}
        className="flex-row gap-2 border-t border-border bg-canvas px-4 py-3"
      >
        <Button
          variant="secondary"
          className="flex-1 px-2"
          onPress={() => router.push({ pathname: '/product-form', params: { id: String(p.id) } })}
        >
          {t('common.edit')}
        </Button>
        {archived ? (
          <Button className="flex-[1.4] px-2" loading={restore.isPending} onPress={restoreProduct}>
            {t('products.detail.restore')}
          </Button>
        ) : (
          <Button className="flex-[1.4] px-2" loading={markFinished.isPending} onPress={finish}>
            {t('products.detail.markFinished')}
          </Button>
        )}
        {buyAgain ? (
          <Button
            variant="secondary"
            className="flex-1 px-2"
            onPress={() => buyAgain([{ id: p.id, name: p.name }])}
          >
            {t('common.buyAgain')}
          </Button>
        ) : null}
      </View>

      {p.photoUri ? (
        <PhotoViewer uri={p.photoUri} open={viewerOpen} onClose={() => setViewerOpen(false)} />
      ) : null}

      {ingredientsKey > 0 && avoid ? (
        <IngredientEntrySheet
          key={ingredientsKey}
          open={ingredientsOpen}
          onClose={() => setIngredientsOpen(false)}
          value={p.ingredients.map((i) => i.name).join('\n')}
          onSave={(text) => update.mutate({ id: p.id, input: withIngredients(p, text) })}
          known={known}
          avoid={avoid}
        />
      ) : null}

      <AlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('products.archive.deleteTitle', { name: p.name })}
        description={t('products.archive.deleteBody')}
        actionLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onAction={async () => {
          setDeleteOpen(false);
          await remove.mutateAsync(p.id);
          goBack();
        }}
      />
    </Frame>
  );
}

/** The reserved 1:1 photo box; without a photo, the category glyph on `subtle`. */
function PhotoBox({ product: p, onOpen }: { product: ProductDetail; onOpen: () => void }) {
  const { t } = useTranslation();
  if (!p.photoUri) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="aspect-square w-[160px] items-center justify-center self-center rounded-xl bg-subtle"
      >
        <Icon name={categoryGlyph(p.category)} size={64} tone="ink-muted" />
      </View>
    );
  }
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="imagebutton"
      accessibilityLabel={t('products.detail.openPhoto')}
      className="aspect-square w-full overflow-hidden rounded-xl bg-subtle active:opacity-85"
    >
      <Image
        source={{ uri: p.photoUri }}
        contentFit="cover"
        transition={200}
        style={{ width: '100%', height: '100%' }}
      />
    </Pressable>
  );
}

function ExpiryCard({ product: p }: { product: ProductDetail }) {
  const { t } = useTranslation();
  const f = useFormat();
  const badge = detailBadge(p, t);
  const line = expiryLine(p, f);
  const progress = p.archivedAt ? null : expiryProgress(p, f.today);
  const months = p.paoMonths;
  return (
    <Card title={t('products.detail.expiry')}>
      <View className="gap-4">
        <View className="flex-row flex-wrap items-center gap-2">
          <Badge status={badge.status}>{badge.label}</Badge>
          {line ? <Text className="text-body tabular-nums">{line}</Text> : null}
        </View>
        {progress !== null ? (
          <Progress
            value={Math.round(progress * 100)}
            max={100}
            accessibilityLabel={t('products.detail.expiryProgress')}
          />
        ) : null}
        <Facts
          rows={[
            {
              label: t('products.detail.purchased'),
              value: p.purchasedAt ? f.date(p.purchasedAt) : null,
            },
            {
              label: t('products.detail.opened'),
              value: p.openedAt ? f.date(p.openedAt) : null,
            },
            {
              label: t('products.detail.printedExpiry'),
              value: p.expiresAt ? f.date(p.expiresAt) : null,
            },
            {
              label: t('products.detail.pao'),
              value: months != null ? t('products.detail.paoValue', { months }) : null,
            },
            ...(p.archivedAt
              ? [{ label: t('products.detail.finished'), value: f.date(p.archivedAt) }]
              : []),
          ]}
        />
      </View>
    </Card>
  );
}

/** Label and value rows; a missing value reads "Not set". */
function Facts({ rows }: { rows: { label: string; value: string | null }[] }) {
  const { t } = useTranslation();
  return (
    <View>
      {rows.map((row) => {
        const value = row.value ?? t('products.detail.notSet');
        return (
          <View
            key={row.label}
            accessible
            accessibilityLabel={`${row.label}, ${value}`}
            className="min-h-[36px] flex-row items-center justify-between gap-3 py-1"
          >
            <Text className="shrink text-body text-ink-muted">{row.label}</Text>
            <Text
              className={cn(
                'shrink text-right text-body tabular-nums',
                row.value ? 'text-ink' : 'text-ink-muted',
              )}
            >
              {value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function UsedInCard({ items }: { items: readonly UsedIn[] }) {
  const { t } = useTranslation();
  return (
    <Card title={t('products.detail.usedIn')} flush>
      {items.map((item, index) => (
        <View key={`${item.kind}-${item.id}`}>
          {index > 0 ? <Separator inset /> : null}
          <ListRow
            label={item.name}
            onPress={() =>
              router.push(
                item.kind === 'hair' ? `/routines/hair/${item.id}` : `/routines/${item.id}`,
              )
            }
          />
        </View>
      ))}
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <View className="gap-6 p-4">
      <Skeleton width={160} height={160} radius={16} className="self-center" />
      <View className="gap-2">
        <Skeleton width="70%" height={28} />
        <Skeleton width="40%" height={22} />
        <Skeleton width={96} height={24} radius={999} />
      </View>
      <Skeleton height={220} radius={16} />
    </View>
  );
}

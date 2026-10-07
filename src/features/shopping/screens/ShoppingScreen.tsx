import { useSelector } from '@tanstack/react-store';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { ChipGroup } from '@/components/ui/chip';
import { Collapsible } from '@/components/ui/collapsible';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB_LIST_END_SPACE, Fab } from '@/components/ui/fab';
import { Icon, type IconName } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Separator } from '@/components/ui/separator';
import { Sheet } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { getDb } from '@/db';
import { ratingLine } from '@/features/products/ratingText';
import type { ShoppingItem } from '@/db/schema';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/cn';
import { appStore } from '@/state/app';
import { showToast } from '@/state/ui';
import { motion } from '@/theme/motion';
import { rowEntering, rowExiting, rowLayout } from '@/theme/listMotion';

import {
  useClearBought,
  useDeleteItem,
  useDismissSuggestion,
  useMoveToList,
  useRestoreItems,
  useSetBought,
  useShoppingList,
  useSuggestions,
} from '../api';
import { useBuyAgain } from '../buyAgain';
import { ShoppingItemSheet } from '../components/ShoppingItemSheet';
import { ShoppingRow, type ShoppingRowAction } from '../components/ShoppingRow';
import { prefillFromItem, shareText } from '../repo';
import type { ShoppingAreaFilter, ShoppingRowItem, Suggestion } from '../types';
import { setShoppingArea, setSuggestionsOpen, shoppingViewStore } from '../viewState';

/** Header word Share on the Shopping segment: the list as plain text in the share sheet. */
export function ShoppingShareButton() {
  const { t, i18n } = useTranslation();
  const all = useShoppingList('all').data;
  const empty = !all || all.toBuy.length + all.wantToTry.length === 0;
  const share = () => {
    const message = shareText(getDb(), (key, opts) => t(key, opts), i18n.language);
    Share.share({ message, title: t('shopping.title') }).catch(() => {});
  };
  return (
    <Pressable
      onPress={share}
      disabled={empty}
      accessibilityRole="button"
      accessibilityState={{ disabled: empty }}
      hitSlop={4}
      className={cn(
        'min-h-[44px] min-w-[44px] flex-row items-center justify-center gap-1.5 px-2 active:opacity-85',
        empty && 'opacity-45',
      )}
    >
      <Icon name="share-2" size={18} tone="accent" />
      <Text className="text-body-strong text-accent">{t('shopping.share')}</Text>
    </Pressable>
  );
}

/** P6 Shopping list, the Shopping segment of the Products tab. */
export function ShoppingScreen() {
  const { t } = useTranslation();
  const area = useSelector(shoppingViewStore, (s) => s.area);
  const list = useShoppingList(area);
  const suggested = useSuggestions();
  const setBought = useSetBought();
  const moveToList = useMoveToList();
  const remove = useDeleteItem();
  const restore = useRestoreItems();
  const clear = useClearBought();

  const [sheet, setSheet] = useState<{
    key: number;
    open: boolean;
    editing: ShoppingRowItem | null;
  }>({ key: 0, open: false, editing: null });
  const [menu, setMenu] = useState<{ key: number; open: boolean; item: ShoppingRowItem | null }>({
    key: 0,
    open: false,
    item: null,
  });

  const openSheet = (editing: ShoppingRowItem | null = null) =>
    setSheet((s) => ({ key: s.key + 1, open: true, editing }));
  const openMenu = (item: ShoppingRowItem) =>
    setMenu((m) => ({ key: m.key + 1, open: true, item }));
  const closeMenu = () => setMenu((m) => ({ ...m, open: false }));

  const sections = list.data;
  const suggestions = suggested.data ?? [];
  const pending = list.isPending || suggested.isPending;
  const nothing =
    !!sections &&
    area === 'all' &&
    sections.toBuy.length + sections.wantToTry.length + sections.bought.length === 0 &&
    suggestions.length === 0;

  const deleteRow = async (item: ShoppingRowItem) => {
    const row = await remove.mutateAsync(item.id);
    if (!row) return;
    showToast({
      message: t('shopping.removedToast', { name: item.name }),
      actionLabel: t('common.undo'),
      onAction: () => restore.mutate([row]),
    });
  };

  const clearBought = async () => {
    const rows: ShoppingItem[] = await clear.mutateAsync();
    if (rows.length === 0) return;
    showToast({
      message: t('shopping.clearedToast', { count: rows.length }),
      actionLabel: t('common.undo'),
      onAction: () => restore.mutate(rows),
    });
  };

  const rowActions = (item: ShoppingRowItem): ShoppingRowAction[] => {
    const actions: ShoppingRowAction[] = [
      { key: 'edit', label: t('common.edit'), onPress: () => openSheet(item) },
    ];
    if (item.boughtAt === null) {
      actions.push(
        item.list === 'to_buy'
          ? {
              key: 'move',
              label: t('shopping.moveToTry'),
              onPress: () => moveToList.mutate({ id: item.id, list: 'want_to_try' }),
            }
          : {
              key: 'move',
              label: t('shopping.moveToBuy'),
              onPress: () => moveToList.mutate({ id: item.id, list: 'to_buy' }),
            },
      );
    }
    actions.push({ key: 'delete', label: t('common.delete'), onPress: () => void deleteRow(item) });
    return actions;
  };

  const renderRows = (items: ShoppingRowItem[]) => (
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
              {index > 0 ? <Separator className="ml-[54px]" /> : null}
              <ShoppingRow
                item={item}
                onToggle={(bought) => setBought.mutate({ id: item.id, bought })}
                onLongPress={() => openMenu(item)}
                actions={rowActions(item)}
                onMoveToBuy={
                  item.list === 'want_to_try' && item.boughtAt === null
                    ? () => moveToList.mutate({ id: item.id, list: 'to_buy' })
                    : undefined
                }
                onAddProduct={() => addProduct(item)}
              />
            </Animated.View>
          ))}
        </Card>
      </Animated.View>
    </LayoutAnimationConfig>
  );

  return (
    <View className="flex-1">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          gap: 24,
          paddingBottom: FAB_LIST_END_SPACE,
        }}
      >
        {pending || !sections ? (
          <SkeletonRows />
        ) : nothing ? (
          <EmptyState
            icon="shopping-cart"
            title={t('shopping.emptyTitle')}
            actionLabel={t('shopping.addItem')}
            actionIcon="plus"
            onAction={() => openSheet()}
          >
            {t('shopping.emptyBody')}
          </EmptyState>
        ) : (
          <Animated.View entering={FadeIn.duration(motion.duration.fast)} className="gap-6">
            {suggestions.length > 0 ? <SuggestedSection items={suggestions} /> : null}

            <View className="gap-2">
              <View className="min-h-[36px] flex-row flex-wrap items-center justify-between gap-2 px-1">
                <Text accessibilityRole="header" className="text-title-s">
                  {t('shopping.toBuy')}
                </Text>
                <ChipGroup
                  single
                  allowEmpty={false}
                  accessibilityLabel={t('shopping.areaFilter')}
                  value={[area]}
                  onValueChange={(v) => setShoppingArea((v[0] ?? 'all') as ShoppingAreaFilter)}
                  items={[
                    { value: 'all', label: t('products.all') },
                    { value: 'skin', label: t('common.skin') },
                    { value: 'hair', label: t('common.hair') },
                  ]}
                />
              </View>
              {sections.toBuy.length > 0 ? (
                renderRows(sections.toBuy)
              ) : (
                <Text className="px-1 py-3 text-body text-ink-muted">
                  {t('shopping.toBuyEmpty')}
                </Text>
              )}
            </View>

            {sections.wantToTry.length > 0 ? (
              <View className="gap-2">
                <Text accessibilityRole="header" className="px-1 text-title-s">
                  {t('shopping.wantToTry')}
                </Text>
                {renderRows(sections.wantToTry)}
              </View>
            ) : null}

            {sections.bought.length > 0 ? (
              <View className="gap-2">
                <View className="min-h-[44px] flex-row items-center justify-between gap-2 pl-1">
                  <Text accessibilityRole="header" className="flex-1 text-title-s">
                    {t('shopping.bought')}
                  </Text>
                  <Pressable
                    onPress={clearBought}
                    accessibilityRole="button"
                    hitSlop={4}
                    className="min-h-[44px] justify-center px-2 active:opacity-85"
                  >
                    <Text className="text-body-strong text-accent">
                      {t('shopping.clearBought')}
                    </Text>
                  </Pressable>
                </View>
                {renderRows(sections.bought)}
              </View>
            ) : null}
          </Animated.View>
        )}
      </ScrollView>

      {sheet.open || menu.open ? null : (
        <Animated.View
          entering={FadeIn.duration(motion.duration.base)}
          exiting={FadeOut.duration(motion.duration.fast)}
          className="absolute bottom-4 right-4"
        >
          <Fab className="static" onPress={() => openSheet()}>
            {t('shopping.addItem')}
          </Fab>
        </Animated.View>
      )}

      <ShoppingItemSheet
        key={sheet.key}
        open={sheet.open}
        editing={sheet.editing}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
      />

      {menu.item ? (
        <Sheet
          key={menu.key}
          open={menu.open}
          onClose={() => setMenu((m) => ({ ...m, open: false, item: null }))}
          title={menu.item.name}
        >
          <View className="-mx-4">
            {rowActions(menu.item).map((action) => (
              <ListRow
                key={action.key}
                label={action.label}
                icon={actionIcon(action.key)}
                tone={action.key === 'delete' ? 'danger' : undefined}
                trailing="none"
                onPress={() => {
                  closeMenu();
                  action.onPress();
                }}
              />
            ))}
          </View>
        </Sheet>
      ) : null}
    </View>
  );
}

/** Add product (short form) pre-filled from a bought item; saving links the item to it. */
function addProduct(item: ShoppingRowItem): void {
  const prefill = prefillFromItem(getDb(), item.id, appStore.state.activeDay);
  if (!prefill) return;
  router.push({
    pathname: '/product-form',
    params: { prefill: JSON.stringify(prefill), fromShoppingItem: String(item.id) },
  });
}

function actionIcon(key: string): IconName {
  if (key === 'edit') return 'pencil';
  if (key === 'delete') return 'trash-2';
  return 'list';
}

/** Suggested: finished and expiring products, collapsible (remembered for the session). */
function SuggestedSection({ items }: { items: Suggestion[] }) {
  const { t } = useTranslation();
  const open = useSelector(shoppingViewStore, (s) => s.suggestionsOpen);
  return (
    <View className="gap-2">
      <Pressable
        onPress={() => setSuggestionsOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${t('shopping.suggested')}, ${items.length}`}
        className="min-h-[44px] flex-row items-center gap-2 px-1 active:opacity-85"
      >
        <Text className="text-title-s">{t('shopping.suggested')}</Text>
        <Text className="flex-1 text-body tabular-nums text-ink-muted">{items.length}</Text>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={20} tone="ink-muted" />
      </Pressable>
      <Collapsible open={open}>
        <LayoutAnimationConfig skipEntering>
          <Card flush>
            {items.map((s, index) => (
              <Animated.View
                key={s.productId}
                entering={rowEntering}
                exiting={rowExiting}
                layout={rowLayout}
              >
                {index > 0 ? <Separator className="ml-4" /> : null}
                <SuggestionRow item={s} />
              </Animated.View>
            ))}
          </Card>
        </LayoutAnimationConfig>
      </Collapsible>
    </View>
  );
}

function SuggestionRow({ item }: { item: Suggestion }) {
  const { t } = useTranslation();
  const f = useFormat();
  const buyAgain = useBuyAgain();
  const dismiss = useDismissSuggestion();
  const why =
    item.reason.kind === 'finished'
      ? t('shopping.finishedOn', { date: f.date(item.reason.day) })
      : item.reason.kind === 'expired'
        ? t('shopping.expiredOn', { date: f.date(item.reason.day) })
        : f.relativeExpiry(item.reason.daysLeft);
  const rated = ratingLine(t, item.rating, item.wouldRebuy);
  return (
    <View
      testID={`suggestion-${item.productId}`}
      className="min-h-[56px] flex-row items-center gap-1 py-2 pl-4 pr-1"
    >
      <View
        className="flex-1 gap-0.5"
        accessible
        accessibilityLabel={[item.name, item.brand, why, rated].filter(Boolean).join(', ')}
      >
        <Text className="text-body-strong">{item.name}</Text>
        <Text
          className={cn(
            'text-caption tabular-nums',
            item.reason.kind === 'expired' ? 'text-danger' : 'text-ink-muted',
          )}
        >
          {item.brand ? `${item.brand} · ${why}` : why}
        </Text>
        {rated ? <Text className="text-caption tabular-nums text-ink-muted">{rated}</Text> : null}
      </View>
      {buyAgain ? (
        <RoundButton
          icon="plus"
          label={`${t('common.buyAgain')}, ${item.name}`}
          tone="accent"
          onPress={() => buyAgain([{ id: item.productId, name: item.name }])}
        />
      ) : null}
      <RoundButton
        icon="x"
        label={`${t('shopping.dismiss')}, ${item.name}`}
        tone="ink-muted"
        onPress={() => dismiss.mutate(item.productId)}
      />
    </View>
  );
}

function RoundButton({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: IconName;
  label: string;
  tone: 'accent' | 'ink-muted';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-[44px] w-[44px] items-center justify-center rounded-full active:opacity-85"
    >
      <Icon name={icon} size={22} tone={tone} />
    </Pressable>
  );
}

function SkeletonRows() {
  return (
    <View className="gap-2">
      <Skeleton width={96} height={20} />
      <Card flush>
        {[0, 1, 2].map((i) => (
          <View key={i}>
            {i > 0 ? <Separator className="ml-[54px]" /> : null}
            <View className="min-h-[56px] flex-row items-center gap-3 px-4 py-3">
              <Skeleton width={26} height={26} radius={7} />
              <View className="flex-1 gap-2">
                <Skeleton width="55%" height={16} />
                <Skeleton width="35%" height={12} />
              </View>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

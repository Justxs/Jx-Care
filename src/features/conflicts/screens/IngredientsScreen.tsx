import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB_LIST_END_SPACE, Fab } from '@/components/ui/fab';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { ToggleGroup } from '@/components/ui/toggle-group';
import { normalizeName } from '@/lib/text';
import { motion } from '@/theme/motion';
import { rowEntering, rowExiting, rowLayout } from '@/theme/listMotion';

import { useGroups, useIngredients } from '../api';
import { GroupSheet } from '../components/GroupSheet';
import { IngredientSheet } from '../components/IngredientSheet';
import { MergeSheet } from '../components/MergeSheet';
import type { GroupListItem, IngredientListItem } from '../repo';

type Segment = 'ingredients' | 'groups';

const SELECTION_BAR_SPACE = 104;

const matches = (name: string, q: string) => !q || normalizeName(name).includes(q);

/** S2 Ingredients and groups: rename, group, merge duplicates, and edit groups. */
export function IngredientsScreen() {
  const { t } = useTranslation();
  const [segment, setSegment] = useState<Segment>('ingredients');
  const [search, setSearch] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  // Sheets keep a snapshot of what they opened with, so a merge or delete never unmounts them
  // halfway through closing.
  const [ingredientSheet, setIngredientSheet] = useState<{
    key: number;
    open: boolean;
    item: IngredientListItem | null;
  }>({ key: 0, open: false, item: null });
  const [groupSheet, setGroupSheet] = useState<{
    key: number;
    open: boolean;
    group: GroupListItem | null;
  }>({ key: 0, open: false, group: null });
  const [mergeSheet, setMergeSheet] = useState<{
    key: number;
    open: boolean;
    items: IngredientListItem[];
  }>({ key: 0, open: false, items: [] });
  const ingredients = useIngredients();
  const groups = useGroups();
  const allIngredients = ingredients.data ?? [];
  const allGroups = groups.data ?? [];

  const q = normalizeName(search);
  const shownIngredients = allIngredients.filter(
    (i) => matches(i.name, q) || matches(i.groupName ?? '', q),
  );
  const shownGroups = allGroups.filter((g) => matches(g.name, q));
  const selectedItems = allIngredients.filter((i) => selected.has(i.id));

  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };
  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const canSelect = segment === 'ingredients' && allIngredients.length >= 2;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScreenHeader
        title={t('screens.ingredients')}
        onBack={() => router.back()}
        action={
          selecting
            ? { text: t('common.done'), onPress: stopSelecting }
            : canSelect
              ? { text: t('ingredients.select'), onPress: () => setSelecting(true) }
              : undefined
        }
      />
      <View className="gap-2 px-4 pb-2">
        <ToggleGroup
          accessibilityLabel={t('ingredients.segments')}
          value={segment}
          onValueChange={(v) => {
            stopSelecting();
            setSegment(v as Segment);
          }}
          items={[
            { value: 'ingredients', label: t('ingredients.tabs.ingredients') },
            { value: 'groups', label: t('ingredients.tabs.groups') },
          ]}
        />
        <Input
          noHelper
          leadingIcon="search"
          value={search}
          onChangeText={setSearch}
          placeholder={t('ingredients.search')}
          accessibilityLabel={t('ingredients.search')}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      </View>

      <View className="flex-1">
        <Animated.View
          key={segment}
          entering={FadeIn.duration(motion.duration.base)}
          exiting={FadeOut.duration(motion.duration.base)}
          className="absolute inset-0"
        >
          <ScrollView
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              gap: 12,
              paddingBottom: FAB_LIST_END_SPACE + (selecting ? SELECTION_BAR_SPACE : 0),
            }}
          >
            {segment === 'ingredients' ? (
              ingredients.isPending ? (
                <SkeletonRows />
              ) : allIngredients.length === 0 ? (
                <EmptyState icon="flask-round" title={t('ingredients.emptyTitle')}>
                  {t('ingredients.emptyBody')}
                </EmptyState>
              ) : shownIngredients.length === 0 ? (
                <NoMatch />
              ) : (
                <>
                  {selecting ? (
                    <Text className="px-1 text-body text-ink-muted">
                      {t('ingredients.selectHint')}
                    </Text>
                  ) : null}
                  <RowCard
                    items={shownIngredients}
                    render={(item) => (
                      <IngredientRow
                        item={item}
                        selecting={selecting}
                        selected={selected.has(item.id)}
                        onPress={() =>
                          selecting
                            ? toggle(item.id)
                            : setIngredientSheet((s) => ({ key: s.key + 1, open: true, item }))
                        }
                      />
                    )}
                  />
                </>
              )
            ) : groups.isPending ? (
              <SkeletonRows />
            ) : allGroups.length === 0 ? (
              <EmptyState icon="layers" title={t('ingredients.groupsEmptyTitle')}>
                {t('ingredients.groupsEmptyBody')}
              </EmptyState>
            ) : shownGroups.length === 0 ? (
              <NoMatch />
            ) : (
              <RowCard
                items={shownGroups}
                render={(group) => (
                  <GroupRow
                    group={group}
                    onPress={() => setGroupSheet((s) => ({ key: s.key + 1, open: true, group }))}
                  />
                )}
              />
            )}
          </ScrollView>
        </Animated.View>
      </View>

      {selecting ? (
        <Animated.View
          entering={FadeIn.duration(motion.duration.base)}
          exiting={FadeOut.duration(motion.duration.fast)}
          testID="selection-bar"
          className="absolute bottom-0 left-0 right-0 gap-2 border-t border-border bg-canvas px-4 py-3"
        >
          <Text className="text-label tabular-nums text-ink-muted">
            {t('ingredients.selected', { count: selectedItems.length })}
          </Text>
          <Button
            icon="link"
            disabled={selectedItems.length < 2}
            onPress={() =>
              setMergeSheet((s) => ({ key: s.key + 1, open: true, items: selectedItems }))
            }
          >
            {t('ingredients.merge')}
          </Button>
        </Animated.View>
      ) : segment === 'groups' ? (
        <Fab onPress={() => setGroupSheet((s) => ({ key: s.key + 1, open: true, group: null }))}>
          {t('ingredients.newGroup')}
        </Fab>
      ) : null}

      {ingredientSheet.item ? (
        <IngredientSheet
          key={`i${ingredientSheet.key}`}
          open={ingredientSheet.open}
          ingredient={ingredientSheet.item}
          groups={allGroups}
          onClose={() => setIngredientSheet((s) => ({ ...s, open: false }))}
        />
      ) : null}
      <GroupSheet
        key={`g${groupSheet.key}`}
        open={groupSheet.open}
        group={groupSheet.group}
        ingredients={allIngredients}
        onClose={() => setGroupSheet((s) => ({ ...s, open: false }))}
      />
      {mergeSheet.items.length >= 2 ? (
        <MergeSheet
          key={`m${mergeSheet.key}`}
          open={mergeSheet.open}
          items={mergeSheet.items}
          onClose={() => setMergeSheet((s) => ({ ...s, open: false }))}
          onMerged={stopSelecting}
        />
      ) : null}
    </SafeAreaView>
  );
}

function RowCard<T extends { id: number }>({
  items,
  render,
}: {
  items: readonly T[];
  render: (item: T) => ReactNode;
}) {
  return (
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
              {index > 0 ? <Separator className="ml-4" /> : null}
              {render(item)}
            </Animated.View>
          ))}
        </Card>
      </Animated.View>
    </LayoutAnimationConfig>
  );
}

function IngredientRow({
  item,
  selecting,
  selected,
  onPress,
}: {
  item: IngredientListItem;
  selecting: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const count =
    item.productCount > 0
      ? t('ingredients.inProducts', { count: item.productCount })
      : t('ingredients.inNoProducts');
  const label = [item.name, item.groupName, count].filter(Boolean).join(', ');
  return (
    <Pressable
      testID={`ingredient-row-${item.id}`}
      onPress={onPress}
      accessibilityRole={selecting ? 'checkbox' : 'button'}
      accessibilityState={selecting ? { checked: selected } : undefined}
      accessibilityLabel={label}
      className="min-h-[64px] flex-row items-center gap-3 px-4 py-3 active:bg-accent-soft"
    >
      {selecting ? (
        <View pointerEvents="none" importantForAccessibility="no-hide-descendants">
          <Checkbox checked={selected} onCheckedChange={() => {}} />
        </View>
      ) : null}
      <View className="flex-1 gap-0.5">
        <Text className="text-body-strong">{item.name}</Text>
        <Text className="text-caption tabular-nums text-ink-muted">{count}</Text>
      </View>
      {item.groupName ? (
        <View className="max-w-[45%] flex-row items-center gap-1 rounded-full bg-subtle px-2.5 py-1">
          <Icon name="layers" size={14} tone="ink-muted" />
          <Text numberOfLines={1} className="shrink text-label text-ink">
            {item.groupName}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function GroupRow({ group, onPress }: { group: GroupListItem; onPress: () => void }) {
  const { t } = useTranslation();
  const count =
    group.memberCount > 0
      ? t('ingredients.members', { count: group.memberCount })
      : t('ingredients.noMembers');
  return (
    <Pressable
      testID={`group-row-${group.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t('ingredients.groupLabel', { name: group.name })}, ${count}`}
      className="min-h-[64px] flex-row items-center gap-3 px-4 py-3 active:bg-accent-soft"
    >
      <Icon name="layers" size={20} tone="ink-muted" />
      <View className="flex-1 gap-0.5">
        <Text className="text-body-strong">{group.name}</Text>
        <Text className="text-caption tabular-nums text-ink-muted">{count}</Text>
      </View>
      <Icon name="chevron-right" size={20} tone="ink-muted" />
    </Pressable>
  );
}

function NoMatch() {
  const { t } = useTranslation();
  return (
    <EmptyState icon="search" title={t('ingredients.noMatchTitle')}>
      {t('ingredients.noMatchBody')}
    </EmptyState>
  );
}

function SkeletonRows() {
  return (
    <Card flush>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i}>
          {i > 0 ? <Separator className="ml-4" /> : null}
          <View className="min-h-[64px] justify-center gap-2 px-4 py-3">
            <Skeleton width="50%" height={16} />
            <Skeleton width="30%" height={12} />
          </View>
        </View>
      ))}
    </Card>
  );
}

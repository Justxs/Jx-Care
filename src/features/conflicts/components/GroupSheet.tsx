import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { normalizeName, tidy } from '@/lib/text';
import { showToast } from '@/state/ui';
import { motion } from '@/theme/motion';
import { rowEntering, rowExiting, rowLayout } from '@/theme/listMotion';

import { useDeleteGroup, useGroupImpact, useSaveGroup } from '../api';
import type { GroupListItem, IngredientListItem } from '../repo';
import { SideResults } from './SidePicker';

export type GroupSheetProps = {
  open: boolean;
  onClose: () => void;
  /** The group to edit; null for a new one. */
  group: GroupListItem | null;
  ingredients: readonly IngredientListItem[];
};

const sameIds = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

/**
 * S2 group editor: name, members with add (ingredient search) and remove, and Delete group with a
 * dialog naming what goes with it. Mount with a new `key` each time it opens.
 */
export function GroupSheet({ open, onClose, group, ingredients }: GroupSheetProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(group?.name ?? '');
  const [memberIds, setMemberIds] = useState<number[]>(group?.members.map((m) => m.id) ?? []);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useSaveGroup();
  const remove = useDeleteGroup();
  // What Delete takes with it, as saved; read up front so the dialog text never changes.
  const impact = useGroupImpact(group?.id ?? null).data;

  const members = ingredients.filter((i) => memberIds.includes(i.id));
  const candidates = useMemo(
    () =>
      ingredients
        .filter((i) => !memberIds.includes(i.id))
        .map((i) => ({
          kind: 'ingredient' as const,
          id: i.id,
          name: i.name,
          detail:
            i.groupName && i.groupId !== group?.id
              ? t('ingredients.groupSheet.inGroup', { group: i.groupName })
              : null,
        })),
    [ingredients, memberIds, group, t],
  );
  const dirty =
    tidy(name) !== (group?.name ?? '') ||
    !sameIds(memberIds, group?.members.map((m) => m.id) ?? []);

  const onSave = async () => {
    if (!normalizeName(name)) {
      setError(t('ingredients.nameRequired'));
      return;
    }
    await save.mutateAsync({ id: group?.id ?? null, name, memberIds });
    onClose();
  };

  const deleteText = impact
    ? [
        impact.members > 0
          ? t('ingredients.groupSheet.deleteMembers', { count: impact.members })
          : null,
        impact.rules > 0 ? t('ingredients.groupSheet.deleteRules', { count: impact.rules }) : null,
        impact.avoid > 0 ? t('ingredients.groupSheet.deleteAvoid') : null,
        t('ingredients.groupSheet.deleteFinal'),
      ]
        .filter(Boolean)
        .join(' ')
    : t('ingredients.groupSheet.deleteFinal');

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        dirty={dirty}
        title={group ? t('ingredients.groupSheet.titleEdit') : t('ingredients.groupSheet.titleNew')}
        footer={
          <Button disabled={!dirty} loading={save.isPending} onPress={onSave}>
            {t('ingredients.groupSheet.save')}
          </Button>
        }
      >
        <Input
          label={t('ingredients.groupSheet.name')}
          placeholder={t('ingredients.groupSheet.namePlaceholder')}
          error={error ?? undefined}
          value={name}
          onChangeText={(v) => {
            setName(v);
            setError(null);
          }}
          onFocus={() => setAdding(false)}
        />
        <Field label={t('ingredients.groupSheet.members')} noHelper>
          {members.length === 0 ? (
            <Text className="min-h-[24px] text-body text-ink-muted">
              {t('ingredients.groupSheet.noMembers')}
            </Text>
          ) : (
            <View className="overflow-hidden rounded-md border border-border">
              {members.map((m, i) => (
                <Animated.View
                  key={m.id}
                  entering={rowEntering}
                  exiting={rowExiting}
                  layout={rowLayout}
                >
                  {i > 0 ? <Separator className="ml-3" /> : null}
                  <View className="min-h-[48px] flex-row items-center pl-3">
                    <Text className="flex-1 text-body">{m.name}</Text>
                    <Pressable
                      onPress={() => setMemberIds((ids) => ids.filter((id) => id !== m.id))}
                      accessibilityRole="button"
                      accessibilityLabel={t('ingredients.groupSheet.remove', { name: m.name })}
                      className="h-[48px] w-[48px] items-center justify-center active:opacity-85"
                    >
                      <Icon name="x" size={20} tone="ink-muted" />
                    </Pressable>
                  </View>
                </Animated.View>
              ))}
            </View>
          )}
        </Field>
        {adding ? (
          <Animated.View
            entering={FadeIn.duration(motion.duration.base)}
            exiting={FadeOut.duration(motion.duration.fast)}
            className="gap-2"
          >
            <Input
              noHelper
              leadingIcon="search"
              value={query}
              onChangeText={setQuery}
              placeholder={t('ingredients.groupSheet.search')}
              accessibilityLabel={t('ingredients.groupSheet.search')}
              autoCorrect={false}
              autoCapitalize="none"
              autoFocus
            />
            <SideResults
              options={candidates}
              query={query}
              emptyLabel={t('ingredients.groupSheet.noMatch')}
              onPick={(o) => {
                setMemberIds((ids) => [...ids, o.id]);
                setQuery('');
                setAdding(false);
              }}
            />
          </Animated.View>
        ) : (
          <Button variant="secondary" icon="plus" onPress={() => setAdding(true)}>
            {t('ingredients.groupSheet.add')}
          </Button>
        )}
        {group ? (
          <Button variant="ghost" icon="trash-2" onPress={() => setConfirmDelete(true)}>
            {t('ingredients.groupSheet.delete')}
          </Button>
        ) : null}
      </Sheet>
      {group ? (
        <AlertDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={t('ingredients.groupSheet.deleteTitle', { name: group.name })}
          description={deleteText}
          actionLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          destructive
          onAction={async () => {
            setConfirmDelete(false);
            await remove.mutateAsync(group.id);
            onClose();
            showToast({ message: t('ingredients.deletedToast', { name: group.name }) });
          }}
        />
      ) : null}
    </>
  );
}

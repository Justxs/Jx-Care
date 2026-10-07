import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { Separator } from '@/components/ui/separator';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { catalogEntry } from '@/lib/ingredientCatalog';
import { normalizeName, tidy } from '@/lib/text';
import { showToast } from '@/state/ui';

import {
  useDeleteIngredient,
  useIngredientProducts,
  useRenameIngredient,
  useSetIngredientGroup,
} from '../api';
import type { GroupListItem, IngredientListItem } from '../repo';

export type IngredientSheetProps = {
  open: boolean;
  onClose: () => void;
  ingredient: IngredientListItem;
  groups: readonly GroupListItem[];
};

const NO_GROUP = 'none';

/**
 * S2 ingredient sheet: rename (into an existing name merges), what it does (for catalogue
 * ingredients, see `src/lib/ingredientCatalog.ts`), set the group, see the products
 * (each opens P2), and delete when nothing uses it. Mount with a new `key` each time it opens.
 */
export function IngredientSheet({ open, onClose, ingredient, groups }: IngredientSheetProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(ingredient.name);
  const [groupId, setGroupId] = useState<number | null>(ingredient.groupId);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const products = useIngredientProducts(ingredient.id).data ?? [];
  const rename = useRenameIngredient();
  const setGroup = useSetIngredientGroup();
  const remove = useDeleteIngredient();
  const about = catalogEntry(ingredient.normalizedName);
  const unused = ingredient.productCount + ingredient.ruleCount + ingredient.avoidCount === 0;

  const nameChanged = tidy(name) !== ingredient.name;
  const groupChanged = groupId !== ingredient.groupId;

  const onSave = async () => {
    if (!normalizeName(name)) {
      setError(t('ingredients.nameRequired'));
      return;
    }
    let id = ingredient.id;
    if (nameChanged) {
      id = await rename.mutateAsync({ id, name });
      if (id !== ingredient.id) {
        showToast({ message: t('ingredients.mergedToast', { name: tidy(name) }) });
      }
    }
    // A merge keeps the other ingredient's group unless one was picked here.
    if (groupChanged) await setGroup.mutateAsync({ id, groupId });
    onClose();
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        dirty={nameChanged || groupChanged}
        title={t('ingredients.sheet.title')}
        footer={
          <Button
            disabled={!nameChanged && !groupChanged}
            loading={rename.isPending || setGroup.isPending}
            onPress={onSave}
          >
            {t('ingredients.sheet.save')}
          </Button>
        }
      >
        <Input
          label={t('ingredients.sheet.name')}
          hint={t('ingredients.sheet.nameHint')}
          error={error ?? undefined}
          value={name}
          onChangeText={(v) => {
            setName(v);
            setError(null);
          }}
          autoCorrect={false}
        />
        {about ? (
          <Field label={t('ingredients.sheet.whatItDoes')} noHelper>
            <Text className="text-body">{t(`ingredients.category.${about.category}`)}</Text>
            {about.aliases.length > 0 ? (
              <Text className="text-caption text-ink-muted">
                {t('ingredients.sheet.alsoCalled', { names: about.aliases.join(', ') })}
              </Text>
            ) : null}
          </Field>
        ) : null}
        <SelectField
          label={t('ingredients.sheet.group')}
          mode="menu"
          value={groupId === null ? NO_GROUP : String(groupId)}
          options={[
            { value: NO_GROUP, label: t('ingredients.sheet.noGroup') },
            ...groups.map((g) => ({ value: String(g.id), label: g.name })),
          ]}
          onValueChange={(v) => setGroupId(v === NO_GROUP ? null : Number(v))}
        />
        <Field label={t('ingredients.sheet.products')} noHelper>
          {products.length === 0 ? (
            <Text className="min-h-[24px] text-body text-ink-muted">
              {t('ingredients.sheet.noProducts')}
            </Text>
          ) : (
            <View className="overflow-hidden rounded-md border border-border">
              {products.map((p, i) => (
                <View key={p.id}>
                  {i > 0 ? <Separator className="ml-3" /> : null}
                  <Pressable
                    onPress={() => {
                      onClose();
                      router.push(`/products/${p.id}`);
                    }}
                    accessibilityRole="link"
                    accessibilityLabel={[
                      p.name,
                      p.brand,
                      p.archivedAt ? t('common.finished') : null,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                    className="min-h-[48px] flex-row items-center gap-3 px-3 py-2 active:bg-accent-soft"
                  >
                    <View className="flex-1">
                      <Text className="text-body">{p.name}</Text>
                      {p.brand || p.archivedAt ? (
                        <Text className="text-caption text-ink-muted">
                          {[p.brand, p.archivedAt ? t('common.finished') : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                    <Icon name="chevron-right" size={20} tone="ink-muted" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </Field>
        {unused ? (
          <Button variant="ghost" icon="trash-2" onPress={() => setConfirmDelete(true)}>
            {t('ingredients.sheet.delete')}
          </Button>
        ) : (
          <Text className="text-caption text-ink-muted">{t('ingredients.sheet.inUse')}</Text>
        )}
      </Sheet>
      <AlertDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('ingredients.sheet.deleteTitle', { name: ingredient.name })}
        description={t('ingredients.sheet.deleteBody')}
        actionLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onAction={async () => {
          setConfirmDelete(false);
          await remove.mutateAsync(ingredient.id);
          onClose();
          showToast({ message: t('ingredients.deletedToast', { name: ingredient.name }) });
        }}
      />
    </>
  );
}

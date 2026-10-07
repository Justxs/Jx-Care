import { useStore } from '@tanstack/react-form';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { useAppForm, useFormDirty } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioList } from '@/components/ui/radio-list';
import { Sheet } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { ToggleGroup } from '@/components/ui/toggle-group';
import type { Area, ShoppingList } from '@/db/enums';
import { AreaField } from '@/features/products/components/ProductFields';
import { showToast } from '@/state/ui';

import { useAddItem, useDeleteItems, usePickerProducts, useUpdateItem } from '../api';
import { useBuyAgain } from '../api';
import { emptyShoppingItem, shoppingItemSchema, type ShoppingItemFormValues } from '../schema';
import type { ShoppingRowItem } from '../types';

type Mode = 'buyAgain' | 'new';

export type ShoppingItemSheetProps = {
  open: boolean;
  /** Asks the sheet to close (after adding) and is called once it has closed. */
  onClose: () => void;
  /** Edits this item instead of adding one. */
  editing?: ShoppingRowItem | null;
};

function formValues(item: ShoppingRowItem | null | undefined): ShoppingItemFormValues {
  if (!item) return emptyShoppingItem;
  return {
    name: item.name,
    brand: item.brand ?? '',
    area: item.area,
    list: item.list,
    note: item.note ?? '',
  };
}

/**
 * P7 Shopping item: Buy again (pick any product, finished ones too) or a New item with name,
 * brand, area, list and note. With `editing`, the New item fields for that item.
 */
export function ShoppingItemSheet({ open, onClose, editing }: ShoppingItemSheetProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('buyAgain');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<number | null>(null);
  const products = usePickerProducts(search);
  const buyAgain = useBuyAgain();
  const add = useAddItem();
  const update = useUpdateItem();
  const undoAdd = useDeleteItems();
  const isEdit = !!editing;
  const showForm = isEdit || mode === 'new';

  const form = useAppForm({
    schema: shoppingItemSchema,
    defaultValues: formValues(editing),
    onSubmit: async (value) => {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: value });
      } else {
        const id = await add.mutateAsync(value);
        showToast({
          message: t('shopping.addedToast', { name: value.name }),
          actionLabel: t('common.undo'),
          onAction: () => undoAdd.mutate([id]),
        });
      }
      onClose();
    },
  });
  const dirty = useFormDirty(form);
  const submitting = useStore(form.store, (s) => s.isSubmitting);

  const list = products.data ?? [];
  const pickedProduct = list.find((p) => p.id === picked) ?? null;

  const submit = () => {
    if (showForm) {
      // Re-check first: a field still focused after a failed try keeps its old error otherwise.
      void Promise.resolve(form.validate('blur')).then(() => form.handleSubmit());
      return;
    }
    if (pickedProduct) {
      buyAgain([{ id: pickedProduct.id, name: pickedProduct.name }]);
      onClose();
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dirty={showForm && dirty}
      title={isEdit ? t('shopping.sheet.editTitle') : t('shopping.sheet.title')}
      footer={
        <Button
          onPress={submit}
          loading={submitting}
          disabled={!showForm && pickedProduct === null}
        >
          {isEdit ? t('shopping.sheet.save') : t('shopping.addItem')}
        </Button>
      }
    >
      {isEdit ? null : (
        <ToggleGroup
          accessibilityLabel={t('shopping.sheet.mode')}
          value={mode}
          onValueChange={(v) => setMode(v as Mode)}
          items={[
            { value: 'buyAgain', label: t('common.buyAgain') },
            { value: 'new', label: t('shopping.sheet.newItem') },
          ]}
        />
      )}

      {showForm ? (
        <View>
          <form.AppField name="name">
            {(field) => (
              <field.TextField
                label={t('products.form.name')}
                placeholder={t('products.form.namePlaceholder')}
                autoCapitalize="sentences"
              />
            )}
          </form.AppField>
          <form.AppField name="brand">
            {(field) => <field.TextField label={t('products.form.brand')} />}
          </form.AppField>
          <form.Field name="area">
            {(field) => (
              <AreaField
                value={field.state.value ?? undefined}
                onChange={(area: Area) => field.handleChange(area)}
              />
            )}
          </form.Field>
          <form.Field name="list">
            {(field) => (
              <Field label={t('shopping.sheet.list')}>
                <ToggleGroup
                  accessibilityLabel={t('shopping.sheet.list')}
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v as ShoppingList)}
                  items={[
                    { value: 'to_buy', label: t('shopping.toBuy') },
                    { value: 'want_to_try', label: t('shopping.wantToTry') },
                  ]}
                />
              </Field>
            )}
          </form.Field>
          <form.AppField name="note">
            {(field) => (
              <field.TextField
                label={t('shopping.sheet.note')}
                hint={t('shopping.sheet.noteHint')}
                autoCapitalize="sentences"
              />
            )}
          </form.AppField>
        </View>
      ) : (
        <View className="gap-3">
          <Input
            noHelper
            leadingIcon="search"
            value={search}
            onChangeText={setSearch}
            placeholder={t('products.search')}
            accessibilityLabel={t('products.search')}
            autoCorrect={false}
          />
          {products.isPending ? (
            <View className="gap-2">
              <Skeleton height={56} />
              <Skeleton height={56} />
              <Skeleton height={56} />
            </View>
          ) : list.length === 0 ? (
            <Text className="min-h-[56px] py-4 text-center text-body text-ink-muted">
              {search.trim() === '' ? t('shopping.sheet.noProducts') : t('shopping.sheet.noMatch')}
            </Text>
          ) : (
            <RadioList
              accessibilityLabel={t('shopping.sheet.products')}
              value={picked === null ? undefined : String(picked)}
              onValueChange={(v) => setPicked(Number(v))}
              items={list.map((p) => ({
                value: String(p.id),
                label: p.name,
                detail:
                  [p.brand, p.finished ? t('common.finished') : null].filter(Boolean).join(' · ') ||
                  undefined,
              }))}
            />
          )}
        </View>
      )}
    </Sheet>
  );
}

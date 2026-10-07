import type { AnyFieldApi } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-form';
import { useSelector } from '@tanstack/react-store';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { BOTTOM_BAR_HEIGHT, BottomBar } from '@/components/ui/bottom-bar';
import { Button } from '@/components/ui/button';
import { useScreenCloseGuard } from '@/components/ui/screen-close-guard';
import { Collapsible } from '@/components/ui/collapsible';
import { DateField } from '@/components/ui/date-field';
import { DiscardDialog } from '@/components/ui/discard-dialog';
import { useAppForm, useFieldError, useFormDirty } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { productCategories, type Area } from '@/db/enums';
import { useIngredientInRule } from '@/features/conflicts/hooks';
import { useSettings } from '@/features/settings/api';
import { useLinkBoughtItem } from '@/features/shopping/api';
import { currencySymbol } from '@/features/settings/currencies';
import { parseIngredientLines } from '@/lib/ingredients';
import { appStore } from '@/state/app';
import { showToast } from '@/state/ui';

import {
  discardPickedPhoto,
  useAvoidContext,
  useCreateProduct,
  useHasAnyProduct,
  useKnownIngredients,
  useProduct,
  useUpdateProduct,
} from '../api';
import { IngredientEntrySheet } from '../components/IngredientEntrySheet';
import { IngredientPills } from '../components/IngredientPills';
import {
  AreaField,
  BrandField,
  ExpiryPreview,
  MonthsField,
  PhotoField,
} from '../components/ProductFields';
import { QuickOpenFields } from '../components/QuickFields';
import { avoidedLines, linePills } from '../detail';
import { onProductSaved } from '../events';
import { productAddedForPick } from '../pickReturn';
import type { AvoidContext } from '../repo';
import {
  decimalText,
  emptyProductForm,
  productSchema,
  type ProductFormValues,
  type ProductInput,
} from '../schema';
import { categoryLabel } from '../statusText';
import type { ProductDetail } from '../types';

/** Period after opening presets on the full form (P3). */
const FULL_PAO = [3, 6, 9, 12, 18, 24, 36] as const;

type Mode = 'add' | 'edit';

/**
 * P3 product form. Without `id`: Add product, the short form (every new product), optionally
 * prefilled from a bought shopping item (`prefill`, JSON of form values, task 034). With `id`:
 * Edit product, the full form. `fromShoppingItem` (with `prefill`) links that bought shopping item
 * to the saved product, so its "Add it to your products" line goes away.
 */
export function ProductFormScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    prefill?: string;
    fromShoppingItem?: string;
  }>();
  const id = params.id ? Number(params.id) : null;
  if (id !== null && Number.isFinite(id)) return <EditProduct id={id} />;
  const fromItem = params.fromShoppingItem ? Number(params.fromShoppingItem) : null;
  return (
    <AddProduct
      prefill={parsePrefill(params.prefill)}
      fromShoppingItem={fromItem !== null && Number.isFinite(fromItem) ? fromItem : undefined}
    />
  );
}

function parsePrefill(raw: string | undefined): Partial<ProductFormValues> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === 'object' && value !== null ? (value as Partial<ProductFormValues>) : {};
  } catch {
    return {};
  }
}

function newProductValues(today: string, prefill: Partial<ProductFormValues> = {}) {
  return {
    ...emptyProductForm,
    unit: 'ml' as const,
    purchasedAt: today,
    openedAt: today,
    ...prefill,
  } satisfies ProductFormValues;
}

function toFormValues(p: ProductDetail): ProductFormValues {
  return {
    name: p.name,
    brand: p.brand ?? '',
    area: p.area,
    category: p.category,
    size: p.size == null ? '' : decimalText(p.size),
    unit: p.unit,
    price: p.priceCents == null ? '' : (p.priceCents / 100).toFixed(2).replace('.', ','),
    purchasedAt: p.purchasedAt,
    expiresAt: p.expiresAt,
    openedAt: p.openedAt,
    paoMonths: p.paoMonths == null ? '' : String(p.paoMonths),
    notes: p.notes ?? '',
    photoUri: p.photoUri,
    ingredients: p.ingredients.map((i) => i.name).join('\n'),
  };
}

function AddProduct({
  prefill,
  fromShoppingItem,
}: {
  prefill: Partial<ProductFormValues>;
  fromShoppingItem?: number;
}) {
  const today = useSelector(appStore, (s) => s.activeDay);
  return (
    <ProductForm
      mode="add"
      initial={newProductValues(today, prefill)}
      fromShoppingItem={fromShoppingItem}
    />
  );
}

function EditProduct({ id }: { id: number }) {
  const { t } = useTranslation();
  const product = useProduct(id);
  if (!product.data) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
        <ScreenHeader title={t('products.form.editTitle')} onBack={() => router.back()} close />
        <View className="gap-4 p-4">
          <Skeleton width={120} height={120} radius={16} />
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={42} />
        </View>
      </SafeAreaView>
    );
  }
  return <ProductForm mode="edit" productId={id} initial={toFormValues(product.data)} />;
}

/** Gives a custom field its error the same way the built-in fields do. */
function WithError({
  field,
  children,
}: {
  field: AnyFieldApi;
  children: (error: string | undefined) => ReactNode;
}) {
  return children(useFieldError(field));
}

function ProductForm({
  mode,
  productId,
  initial,
  fromShoppingItem,
}: {
  mode: Mode;
  productId?: number;
  initial: ProductFormValues;
  fromShoppingItem?: number;
}) {
  const { t, i18n } = useTranslation();
  const today = useSelector(appStore, (s) => s.activeDay);
  const schema = useMemo(() => productSchema(today), [today]);
  const currency = useSettings().data?.currency ?? 'EUR';
  const hasAny = useHasAnyProduct().data;
  const known = useKnownIngredients().data ?? [];
  const avoid: AvoidContext = useAvoidContext().data ?? { items: [], groupOf: new Map() };
  const inRule = useIngredientInRule();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const linkBoughtItem = useLinkBoughtItem();

  const scroll = useRef<React.ComponentRef<typeof KeyboardAwareScrollView>>(null);
  /** Photos picked in this form; the ones not saved are deleted on save or discard. */
  const picked = useRef<string[]>([]);
  const linked = useRef(false);
  const afterSave = useRef<'close' | 'another'>('close');
  const [savingAs, setSavingAs] = useState<'close' | 'another'>('close');
  const [moreOpen, setMoreOpen] = useState(mode === 'edit');
  const [ingredientsKey, setIngredientsKey] = useState(0);
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [pending, setPending] = useState<ProductInput | null>(null);
  // The form's defaults live here: TanStack Form re-applies `defaultValues` on every render, so
  // "Save and add another" must change them too or a prefilled form would fill itself again.
  const [defaults, setDefaults] = useState(initial);

  const save = async (value: ProductInput) => {
    const keep = value.photoUri;
    const cleanUp = () => {
      for (const uri of picked.current) if (uri !== keep) discardPickedPhoto(uri);
      picked.current = [];
    };
    if (mode === 'edit' && productId !== undefined) {
      await update.mutateAsync({ id: productId, input: value });
      cleanUp();
      showToast({ message: t('products.form.savedToast') });
      guard.leave();
      return;
    }
    const { id, isFirstWithExpiry } = await create.mutateAsync(value);
    cleanUp();
    // Only the first product saved from a bought item replaces it ("Save and add another" then
    // continues with a plain form).
    if (fromShoppingItem !== undefined && !linked.current) {
      linked.current = true;
      linkBoughtItem.mutate({ itemId: fromShoppingItem, productId: id });
    }
    showToast({ message: t('products.form.addedToast', { name: value.name }) });
    onProductSaved({ id, name: value.name }, { isFirstWithExpiry });
    productAddedForPick({ id, area: value.area });
    if (afterSave.current === 'another') {
      const next = newProductValues(today);
      setDefaults(next);
      form.reset(next);
      setMoreOpen(false);
      scroll.current?.scrollTo({ y: 0, animated: true });
    } else {
      guard.leave();
    }
  };

  const form = useAppForm({
    schema,
    defaultValues: defaults,
    onSubmit: async (value) => {
      if (avoidedLines(value.ingredients, known, avoid).length > 0) {
        setPending(value);
        return;
      }
      await save(value);
    },
  });
  const dirty = useFormDirty(form);
  const pendingAvoided = pending ? avoidedLines(pending.ingredients, known, avoid) : [];
  const submitting = useStore(form.store, (s) => s.isSubmitting);

  const guard = useScreenCloseGuard({
    dirty,
    onDiscard: () => {
      for (const uri of picked.current) discardPickedPhoto(uri);
      picked.current = [];
    },
  });

  const submit = (next: 'close' | 'another') => {
    afterSave.current = next;
    setSavingAs(next);
    void form.handleSubmit();
  };

  const title =
    mode === 'edit'
      ? t('products.form.editTitle')
      : hasAny === false
        ? t('products.form.firstTitle')
        : t('products.form.addTitle');

  const photo = (
    <form.Field name="photoUri">
      {(field) => (
        <PhotoField
          value={field.state.value}
          onChange={field.handleChange}
          onPicked={(uri) => picked.current.push(uri)}
        />
      )}
    </form.Field>
  );
  const brand = (
    <form.Field name="brand">
      {(field) => (
        <WithError field={field}>
          {(error) => (
            <BrandField
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              error={error}
            />
          )}
        </WithError>
      )}
    </form.Field>
  );
  const category = (
    <form.AppField name="category">
      {(field) => (
        <field.SelectField
          label={t('products.form.category')}
          options={productCategories.map((c) => ({ value: c, label: categoryLabel(c, t) }))}
        />
      )}
    </form.AppField>
  );
  const price = (
    <form.AppField name="price">
      {(field) => (
        <field.TextField
          label={t('products.form.price')}
          keyboard="decimal"
          suffix={currencySymbol(currency, i18n.language)}
          className="flex-1"
        />
      )}
    </form.AppField>
  );
  const ingredients = (
    <form.Field name="ingredients">
      {(field) => {
        const lines = parseIngredientLines(field.state.value);
        const avoided = avoidedLines(lines, known, avoid);
        return (
          <View className="gap-1.5">
            <Text className="text-label text-ink">{t('products.form.ingredients')}</Text>
            {lines.length > 0 ? (
              <IngredientPills items={linePills(lines, known, avoid, inRule)} />
            ) : (
              <Text className="text-body text-ink-muted">{t('products.form.noIngredients')}</Text>
            )}
            <Button
              variant="secondary"
              size="sm"
              block={false}
              icon={lines.length > 0 ? 'pencil' : 'plus'}
              onPress={() => {
                setIngredientsKey((k) => k + 1);
                setIngredientsOpen(true);
              }}
            >
              {lines.length > 0 ? t('products.form.editList') : t('products.form.addIngredients')}
            </Button>
            {/* Reserved line for the avoid warning. */}
            <View className="min-h-[36px] flex-row items-start gap-1.5">
              {avoided.length > 0 ? (
                <>
                  <Icon name="ban" size={16} tone="danger" />
                  <Text
                    accessibilityLiveRegion="polite"
                    className="flex-1 text-caption text-danger"
                  >
                    {t('products.form.avoidWarning', {
                      names: avoided.join(', '),
                      count: avoided.length,
                    })}
                  </Text>
                </>
              ) : null}
            </View>
            <IngredientEntrySheet
              key={ingredientsKey}
              open={ingredientsOpen}
              onClose={() => setIngredientsOpen(false)}
              value={lines.join('\n')}
              onSave={field.handleChange}
              known={known}
              avoid={avoid}
            />
          </View>
        );
      }}
    </form.Field>
  );
  const preview = (
    <form.Subscribe
      selector={(s) => ({
        expiresAt: s.values.expiresAt,
        openedAt: s.values.openedAt,
        paoMonths: s.values.paoMonths,
      })}
    >
      {(v) => <ExpiryPreview {...v} />}
    </form.Subscribe>
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScreenHeader title={title} onBack={guard.requestClose} close />
      <KeyboardAwareScrollView
        ref={scroll}
        bottomOffset={BOTTOM_BAR_HEIGHT + 16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 4, paddingBottom: 32 }}
      >
        {mode === 'edit' ? photo : null}
        {mode === 'edit' ? <View className="h-3" /> : null}
        <form.AppField name="name">
          {(field) => (
            <field.TextField
              label={t('products.form.name')}
              placeholder={t('products.form.namePlaceholder')}
              autoCapitalize="sentences"
            />
          )}
        </form.AppField>
        {mode === 'edit' ? brand : null}
        <form.Field name="area">
          {(field) => (
            <WithError field={field}>
              {(error) => (
                <AreaField
                  value={field.state.value as Area | undefined}
                  onChange={(area) => {
                    field.handleChange(area);
                    field.handleBlur();
                  }}
                  error={error}
                />
              )}
            </WithError>
          )}
        </form.Field>

        {mode === 'add' ? (
          <>
            <form.Subscribe
              selector={(s) => ({
                openedAt: s.values.openedAt,
                expiresAt: s.values.expiresAt,
                paoMonths: s.values.paoMonths,
                errors: s.fieldMeta,
                attempts: s.submissionAttempts,
              })}
            >
              {(v) => {
                const err = (name: 'openedAt' | 'paoMonths' | 'expiresAt') => {
                  const meta = v.errors[name];
                  const first: unknown = meta?.errors?.[0];
                  if (!first || (!meta?.isTouched && v.attempts === 0)) return undefined;
                  return t(String(first));
                };
                return (
                  <QuickOpenFields
                    today={today}
                    openedAt={v.openedAt}
                    expiresAt={v.expiresAt}
                    paoMonths={v.paoMonths}
                    errors={{
                      openedAt: err('openedAt'),
                      paoMonths: err('paoMonths'),
                      expiresAt: err('expiresAt'),
                    }}
                    onOpenChange={(open) => {
                      if (open) {
                        form.setFieldValue('openedAt', today);
                        form.setFieldValue('expiresAt', null);
                      } else {
                        form.setFieldValue('openedAt', null);
                        form.setFieldValue('paoMonths', '');
                      }
                    }}
                    onOpenedAt={(d) => form.setFieldValue('openedAt', d)}
                    onPaoMonths={(m) => form.setFieldValue('paoMonths', m)}
                    onExpiresAt={(d) => form.setFieldValue('expiresAt', d)}
                  />
                );
              }}
            </form.Subscribe>
            {preview}
            <Pressable
              onPress={() => setMoreOpen((o) => !o)}
              accessibilityRole="button"
              accessibilityState={{ expanded: moreOpen }}
              className="mt-3 min-h-[44px] flex-row items-center gap-1.5 self-start active:opacity-85"
            >
              <Text className="text-body-strong text-accent">
                {moreOpen ? t('products.form.fewerDetails') : t('products.form.moreDetails')}
              </Text>
              <Icon name="chevron-down" size={18} tone="accent" />
            </Pressable>
            <Collapsible open={moreOpen}>
              <View className="gap-1 pt-2">
                {photo}
                <View className="h-3" />
                {brand}
                {category}
                {price}
                {ingredients}
              </View>
            </Collapsible>
          </>
        ) : (
          <>
            {category}
            <View className="flex-row gap-2">
              <form.AppField name="size">
                {(field) => (
                  <field.TextField
                    label={t('products.form.size')}
                    keyboard="decimal"
                    className="flex-1"
                  />
                )}
              </form.AppField>
              <form.AppField name="unit">
                {(field) => (
                  <field.SelectField
                    mode="menu"
                    label={t('products.form.unit')}
                    options={[
                      { value: 'ml', label: 'ml' },
                      { value: 'g', label: 'g' },
                      { value: 'pcs', label: t('products.form.pcs') },
                    ]}
                    className="w-[96px]"
                  />
                )}
              </form.AppField>
              {price}
            </View>
            <form.AppField name="purchasedAt">
              {(field) => <field.DateField label={t('products.form.purchasedAt')} />}
            </form.AppField>
            <form.AppField name="expiresAt">
              {(field) => (
                <field.DateField
                  label={t('products.form.expiresAt')}
                  hint={t('products.form.expiresAtHint')}
                />
              )}
            </form.AppField>
            <form.Field name="openedAt">
              {(field) => (
                <WithError field={field}>
                  {(error) => (
                    <View>
                      <View className="min-h-[48px] flex-row items-center justify-between">
                        <Text className="text-body">{t('products.form.opened')}</Text>
                        <Switch
                          checked={field.state.value !== null}
                          onCheckedChange={(on) => field.handleChange(on ? today : null)}
                          accessibilityLabel={t('products.form.opened')}
                        />
                      </View>
                      <Collapsible open={field.state.value !== null}>
                        <DateField
                          label={t('products.form.openedAt')}
                          value={field.state.value}
                          onChange={(d) => {
                            field.handleChange(d);
                            field.handleBlur();
                          }}
                          max={today}
                          error={error}
                        />
                      </Collapsible>
                    </View>
                  )}
                </WithError>
              )}
            </form.Field>
            <form.Field name="paoMonths">
              {(field) => (
                <WithError field={field}>
                  {(error) => (
                    <MonthsField
                      label={t('products.form.pao')}
                      hint={t('products.form.paoHint')}
                      presets={FULL_PAO}
                      custom
                      value={field.state.value}
                      onChange={(m) => {
                        field.handleChange(m);
                        field.handleBlur();
                      }}
                      error={error}
                    />
                  )}
                </WithError>
              )}
            </form.Field>
            {ingredients}
            <form.AppField name="notes">
              {(field) => <field.TextField label={t('products.form.notes')} multiline />}
            </form.AppField>
            {preview}
          </>
        )}
      </KeyboardAwareScrollView>

      <BottomBar>
        {mode === 'edit' ? (
          <Button loading={submitting} onPress={() => submit('close')}>
            {t('products.form.saveChanges')}
          </Button>
        ) : (
          <>
            <Button loading={submitting && savingAs === 'close'} onPress={() => submit('close')}>
              {t('products.form.saveProduct')}
            </Button>
            <Button
              variant="ghost"
              loading={submitting && savingAs === 'another'}
              onPress={() => submit('another')}
            >
              {t('products.form.saveAndAdd')}
            </Button>
          </>
        )}
      </BottomBar>

      <DiscardDialog
        open={guard.confirmOpen}
        onDiscard={guard.discard}
        onKeepEditing={guard.keepEditing}
      />
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={t('products.form.avoidTitle')}
        description={t('products.form.avoidBody', {
          names: pendingAvoided.join(', '),
          count: pendingAvoided.length || 1,
        })}
        actionLabel={t('products.form.saveAnyway')}
        cancelLabel={t('products.form.editIngredients')}
        onAction={() => {
          const value = pending;
          setPending(null);
          if (value) void save(value);
        }}
        onCancel={() => {
          setPending(null);
          setMoreOpen(true);
          setIngredientsKey((k) => k + 1);
          setIngredientsOpen(true);
        }}
      />
    </SafeAreaView>
  );
}

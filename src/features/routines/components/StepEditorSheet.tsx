import type { AnyFieldApi } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-form';
import { useSelector } from '@tanstack/react-store';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { useAppForm, useFieldError, useFormDirty } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { ProductThumb } from '@/components/ui/product-thumb';
import { RadioList } from '@/components/ui/radio-list';
import { SelectField } from '@/components/ui/select-field';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { WeekdayPicker } from '@/components/ui/weekday-picker';
import type { StepScheduleKind } from '@/db/enums';
import { ProductPickerSheet } from '@/features/products/components/ProductPickerSheet';
import { useFormat } from '@/i18n/useFormat';
import { appStore } from '@/state/app';
import { motion } from '@/theme/motion';

import { stepSchema, waitSecondsOptions, type StepFormValues } from '../schema';
import type { EditorProduct } from './editorProducts';

/** The note is short: it sits under the product name on Today and in the player. */
export const STEP_NOTE_MAX = 60;

export type StepEditorSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Values it starts from; give the sheet a new `key` for each step. */
  initial: StepFormValues;
  isNew: boolean;
  /** Set days can only pick days the routine runs on. */
  routineDays: readonly number[];
  /** Name and photo for the chosen product. */
  products: ReadonlyMap<number, EditorProduct>;
  onSave: (step: StepFormValues) => void;
  /**
   * "Add new product" in the picker is opening Add product: hide this sheet (it would float over
   * the form) and open it again on return. The new product is already set when it comes back.
   */
  onLeaveForProduct: () => void;
};

/** R3 step editor: product, note, schedule and wait. Saves into the routine's draft only. */
export function StepEditorSheet({
  open,
  onClose,
  initial,
  isNew,
  routineDays,
  products,
  onSave,
  onLeaveForProduct,
}: StepEditorSheetProps) {
  const { t } = useTranslation();
  const f = useFormat();
  const today = useSelector(appStore, (s) => s.activeDay);
  const [pickerOpen, setPickerOpen] = useState(false);

  const schema = useMemo(
    () =>
      stepSchema.superRefine((s, ctx) => {
        if (s.daysOfWeek?.some((d) => !routineDays.includes(d))) {
          ctx.addIssue({
            code: 'custom',
            path: ['daysOfWeek'],
            message: 'routines.errors.stepDaysOutside',
          });
        }
      }),
    [routineDays],
  );

  const form = useAppForm({
    schema,
    defaultValues: initial,
    onSubmit: (value) => {
      onSave(value);
      onClose();
    },
  });
  const dirty = useFormDirty(form);
  const values = useStore(form.store, (s) => s.values);
  const product = values.productId !== null ? products.get(values.productId) : undefined;

  const waitOptions = waitSecondsOptions.map((s) => ({
    value: String(s),
    label: s === 0 ? t('routines.step.waitNone') : f.duration(s),
  }));

  const setKind = (kind: StepScheduleKind) => {
    form.setFieldValue('scheduleKind', kind);
    if (kind === 'interval' && !values.startDate) form.setFieldValue('startDate', today);
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        dirty={dirty}
        title={isNew ? t('routines.step.addTitle') : t('routines.step.editTitle')}
        footer={
          <Button testID="save-step" onPress={() => void form.handleSubmit()}>
            {t('routines.step.save')}
          </Button>
        }
      >
        <Field label={t('routines.step.product')}>
          <Pressable
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`${t('routines.step.product')}, ${
              product?.name ?? t('routines.step.chooseProduct')
            }`}
            testID="step-product"
            className="min-h-[64px] flex-row items-center gap-3 rounded-md border border-border-strong bg-surface px-3 py-2 active:opacity-85"
          >
            {product ? <ProductThumb src={product.photoUri} category={product.category} /> : null}
            <View className="flex-1">
              <Text className={product ? 'text-body-strong' : 'text-body text-ink-muted'}>
                {product?.name ?? t('routines.step.chooseProduct')}
              </Text>
              {product?.brand ? (
                <Text numberOfLines={1} className="text-caption text-ink-muted">
                  {product.brand}
                </Text>
              ) : null}
            </View>
            <Icon name="chevron-right" size={20} tone="ink-muted" />
          </Pressable>
        </Field>

        <form.Field name="note">
          {(field) => (
            <WithError field={field}>
              {(error) => (
                <Input
                  label={t('routines.step.note')}
                  placeholder={t('routines.step.notePlaceholder')}
                  value={field.state.value ?? ''}
                  onChangeText={field.handleChange}
                  onBlur={field.handleBlur}
                  maxLength={STEP_NOTE_MAX}
                  autoCapitalize="sentences"
                  error={error}
                />
              )}
            </WithError>
          )}
        </form.Field>

        <View className="gap-1.5">
          <Text className="text-label text-ink">{t('routines.step.schedule')}</Text>
          <RadioList
            accessibilityLabel={t('routines.step.schedule')}
            value={values.scheduleKind}
            onValueChange={(v) => setKind(v as StepScheduleKind)}
            items={[
              {
                value: 'always',
                label: t('common.everyTime'),
                detail: t('routines.step.everyTimeDetail'),
              },
              {
                value: 'days',
                label: t('common.setDays'),
                detail: t('routines.step.setDaysDetail'),
              },
              {
                value: 'interval',
                label: t('common.everyFewDays'),
                detail: t('routines.step.everyFewDaysDetail'),
              },
            ]}
          />
        </View>

        {/* Reserved height: the detail cross-fades in place, so the sheet never jumps. */}
        <View className="min-h-[96px]">
          <Animated.View
            key={values.scheduleKind}
            entering={FadeIn.duration(motion.duration.base)}
            exiting={FadeOut.duration(motion.duration.fast)}
          >
            {values.scheduleKind === 'days' ? (
              <form.Field name="daysOfWeek">
                {(field) => (
                  <WithError field={field}>
                    {(error) => (
                      <Field
                        label={t('routines.step.days')}
                        hint={t('routines.step.daysHint')}
                        error={error}
                      >
                        <WeekdayPicker
                          accessibilityLabel={t('routines.step.days')}
                          value={field.state.value ?? []}
                          allowed={routineDays}
                          onValueChange={(days) => {
                            field.handleChange(days);
                            field.handleBlur();
                          }}
                        />
                      </Field>
                    )}
                  </WithError>
                )}
              </form.Field>
            ) : values.scheduleKind === 'interval' ? (
              <View className="flex-row items-start gap-3">
                <form.Field name="everyNDays">
                  {(field) => (
                    <WithError field={field}>
                      {(error) => (
                        <Input
                          label={t('common.repeatEveryDays')}
                          placeholder="3"
                          keyboard="numeric"
                          maxLength={2}
                          value={field.state.value == null ? '' : String(field.state.value)}
                          onChangeText={field.handleChange}
                          onBlur={field.handleBlur}
                          error={error}
                          className="flex-1"
                        />
                      )}
                    </WithError>
                  )}
                </form.Field>
                <form.AppField name="startDate">
                  {(field) => (
                    <field.DateField label={t('routines.step.startDate')} className="flex-1" />
                  )}
                </form.AppField>
              </View>
            ) : null}
          </Animated.View>
        </View>

        <form.Field name="waitSeconds">
          {(field) => (
            <WithError field={field}>
              {(error) => (
                // Eight options: it opens its own sheet, stacked over this one.
                <SelectField
                  label={t('routines.step.wait')}
                  value={String(field.state.value)}
                  options={waitOptions}
                  error={error}
                  onValueChange={(v) => {
                    field.handleChange(Number(v));
                    field.handleBlur();
                  }}
                />
              )}
            </WithError>
          )}
        </form.Field>
      </Sheet>

      <ProductPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        area="skin"
        selected={values.productId !== null ? [values.productId] : []}
        onPick={([id]) => {
          if (id !== undefined) form.setFieldValue('productId', id);
        }}
        onAddNew={onLeaveForProduct}
      />
    </>
  );
}

function WithError({
  field,
  children,
}: {
  field: AnyFieldApi;
  children: (error: string | undefined) => ReactNode;
}) {
  return children(useFieldError(field));
}

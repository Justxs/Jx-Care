import type { Meta, StoryObj } from '@storybook/react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { withAppData } from '@/storybook/appData';

import { Button } from './button';
import { useAppForm, useFormDirty } from './form';
import { Text } from './text';

/** "12,99" or "12.99" → 12.99; empty → null. */
function parseDecimal(text: string): number | null {
  const v = text.trim().replace(',', '.');
  if (v === '') return null;
  return /^\d*\.?\d+$|^\d+\.$/.test(v) ? Number(v) : Number.NaN;
}

/** The patterns every real form follows: required text, a decimal, a date, a select, chips. */
const schema = z.object({
  name: z.string().trim().min(1, 'forms.errors.nameRequired'),
  price: z
    .string()
    .refine((v) => !v.trim().startsWith('-'), 'forms.errors.priceMin')
    .refine((v) => !Number.isNaN(parseDecimal(v)), 'forms.errors.priceNumber')
    .transform(parseDecimal),
  purchased: z.string().nullable(),
  opensAt: z.string().nullable(),
  category: z.string().optional(),
  tags: z.array(z.string()).min(1, 'forms.errors.pickOne'),
  notes: z.string(),
});

type Values = z.input<typeof schema>;

const empty: Values = {
  name: '',
  price: '',
  purchased: null,
  opensAt: null,
  category: undefined,
  tags: [],
  notes: '',
};

type SampleFormProps = {
  defaultValues: Values;
  /** Submit once on mount, to show every error at once. */
  submitOnMount?: boolean;
  onSubmit: (value: z.output<typeof schema>) => void;
};

/** A form built with useAppForm and its field components (TextField, DateField, …). */
function SampleForm({ defaultValues, submitOnMount, onSubmit }: SampleFormProps) {
  const { t } = useTranslation();
  const form = useAppForm({ schema, defaultValues, onSubmit: (value) => onSubmit(value) });
  const dirty = useFormDirty(form);
  useEffect(() => {
    if (submitOnMount) void form.handleSubmit();
  }, [form, submitOnMount]);
  return (
    <View className="gap-1">
      <form.AppField name="name">
        {(field) => (
          <field.TextField
            label={t('products.form.name')}
            placeholder={t('products.form.namePlaceholder')}
          />
        )}
      </form.AppField>
      <form.AppField name="price">
        {(field) => (
          <field.TextField label={t('products.form.price')} keyboard="decimal" suffix="€" />
        )}
      </form.AppField>
      <form.AppField name="purchased">
        {(field) => <field.DateField label={t('products.form.purchasedAt')} max="2026-10-07" />}
      </form.AppField>
      <form.AppField name="opensAt">
        {(field) => <field.TimeField label={t('common.timeOfDay')} />}
      </form.AppField>
      <form.AppField name="category">
        {(field) => (
          <field.SelectField
            label={t('products.form.category')}
            options={['cleanser', 'serum', 'moisturiser', 'spf'].map((c) => ({
              value: c,
              label: c,
            }))}
          />
        )}
      </form.AppField>
      <form.AppField name="tags">
        {(field) => (
          <field.ChipField
            label={t('condition.sheet.tags.skin')}
            items={(['calm', 'glow', 'oily', 'dry'] as const).map((v) => ({
              value: v,
              label: t(`common.tags.${v}`),
            }))}
          />
        )}
      </form.AppField>
      <form.AppField name="notes">
        {(field) => <field.TextField label={t('products.form.notes')} multiline />}
      </form.AppField>
      <Text className="pb-2 text-caption text-ink-muted">
        {dirty ? 'Changed: closing would ask "Discard changes?"' : 'Unchanged'}
      </Text>
      <Button onPress={() => void form.handleSubmit()}>{t('common.save')}</Button>
    </View>
  );
}

const meta = {
  title: 'UI/Form',
  component: SampleForm,
  // Dates are formatted with the settings (read from a story database).
  decorators: [withAppData()],
  args: {
    defaultValues: empty,
    submitOnMount: false,
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<SampleFormProps, 'onSubmit'>),
  },
  argTypes: {
    defaultValues: { control: 'object' },
    submitOnMount: { control: 'boolean' },
    onSubmit: { action: 'submitted' },
  },
} satisfies Meta<typeof SampleForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * A new form: no errors until a field is left or Save is pressed. Errors are i18n keys from the
 * zod schema; once a field shows one, it re-checks as you type.
 */
export const Empty: Story = {};

/** Every field filled and valid; Save logs the parsed value (price as a number). */
export const Filled: Story = {
  args: {
    defaultValues: {
      name: 'Vitamin C serum',
      price: '24,90',
      purchased: '2026-09-12',
      opensAt: '07:30',
      category: 'serum',
      tags: ['glow'],
      notes: 'Keep in the fridge.',
    },
  },
};

/** Save pressed on an empty form: each invalid field shows its error in the reserved line. */
export const SubmittedWithErrors: Story = { args: { submitOnMount: true } };

/** An invalid price and a negative one show different errors. */
export const InvalidPrice: Story = {
  args: {
    defaultValues: { ...empty, name: 'Retinol serum', price: '12,9,9', tags: ['calm'] },
    submitOnMount: true,
  },
};

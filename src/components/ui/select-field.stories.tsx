import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { productCategories } from '@/db/enums';

import { SelectField, type SelectFieldProps } from './select-field';

/** Keeps the choice so picking updates the field; a new `value` from Controls starts over. */
function StatefulSelectField(props: SelectFieldProps) {
  const [value, setValue] = useState(props.value);
  return (
    <SelectField
      {...props}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        props.onValueChange?.(v);
      }}
    />
  );
}

const currencies = [
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'USD', label: 'US dollar ($)' },
  { value: 'GBP', label: 'Pound sterling (£)' },
];

const meta = {
  title: 'UI/SelectField',
  component: SelectField,
  args: {
    label: 'Currency',
    value: 'EUR',
    options: currencies,
    placeholder: 'Choose',
    disabled: false,
    noHelper: false,
  },
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    placeholder: { control: 'text' },
    hint: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
    noHelper: { control: 'boolean' },
    mode: { control: 'radio', options: [undefined, 'menu', 'sheet'] },
    valueLines: { control: { type: 'number', min: 1, max: 3, step: 1 } },
    onValueChange: { action: 'changed' },
  },
  render: (args) => <StatefulSelectField key={args.value} {...args} />,
} satisfies Meta<typeof SelectField>;

export default meta;

// Typed from Meta, not `typeof meta`: the required callbacks come from the action argTypes,
// so stories needn't pass them.
type Story = StoryObj<Meta<typeof SelectField>>;

/** Up to six options drop a menu under the field. */
export const Menu: Story = {};

/** Nothing chosen: the placeholder in muted ink. */
export const Placeholder: Story = { args: { value: undefined } };

/** A hint under the field. */
export const WithHint: Story = {
  render: function WithHint(args) {
    const { t } = useTranslation();
    return (
      <StatefulSelectField
        {...args}
        label={t('settings.currency')}
        hint={t('settings.currencyHint')}
      />
    );
  },
};

/** A validation error replaces the hint and outlines the field. */
export const WithError: Story = { args: { value: undefined, error: 'Choose a currency' } };

/** Off: can't be opened. */
export const Disabled: Story = { args: { disabled: true } };

/** More than six options open a radio list in a bottom sheet instead. */
export const LongListSheet: Story = {
  render: function LongListSheet(args) {
    const { t } = useTranslation();
    return (
      <StatefulSelectField
        {...args}
        label={t('products.category')}
        value="serum"
        options={productCategories.map((c) => ({
          value: c,
          label: t(`products.categories.${c}`),
        }))}
      />
    );
  },
};

/** A long Lithuanian value may wrap to two lines when the caller allows it. */
export const LongLithuanian: Story = {
  args: {
    label: 'Pakartojimo dažnumas',
    value: 'b',
    valueLines: 2,
    options: [
      { value: 'a', label: 'Kas dieną' },
      { value: 'b', label: 'Kas kelias dienas, pradedant nuo pirmo naudojimo dienos' },
    ],
  },
};

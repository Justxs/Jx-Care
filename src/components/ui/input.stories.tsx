import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { icons } from './icon';
import { Input, type InputProps } from './input';

/** Keeps its own text so typing works; changes still reach Actions. */
function Stateful(props: InputProps) {
  const [value, setValue] = useState(props.value ?? '');
  return (
    <Input
      {...props}
      value={value}
      onChangeText={(text) => {
        setValue(text);
        props.onChangeText?.(text);
      }}
    />
  );
}

const meta = {
  title: 'UI/Input',
  component: Input,
  args: {
    label: 'Name',
    placeholder: 'Vitamin C serum',
    hint: 'As on the bottle',
    value: '',
    editable: true,
    multiline: false,
    keyboard: 'text',
    type: 'text',
    secret: false,
    noHelper: false,
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    hint: { control: 'text' },
    error: { control: 'text' },
    value: { control: 'text' },
    editable: { control: 'boolean' },
    multiline: { control: 'boolean' },
    keyboard: { control: 'radio', options: ['text', 'numeric', 'decimal'] },
    type: { control: 'radio', options: ['text', 'password'] },
    secret: { control: 'boolean' },
    noHelper: { control: 'boolean' },
    suffix: { control: 'text' },
    leadingIcon: { control: 'select', options: [undefined, ...Object.keys(icons)] },
    onChangeText: { action: 'text changed' },
    onFocus: { action: 'focused' },
    onBlur: { action: 'blurred' },
  },
  // Keyed on `value` so the Controls field resets the typed text.
  render: (args) => <Stateful key={args.value ?? ''} {...args} />,
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Empty, with the placeholder and the hint in the reserved line. Focus turns the border accent. */
export const Empty: Story = {};

export const Filled: Story = { args: { value: 'Retinol serum' } };

/** The error replaces the hint and the border turns danger. */
export const WithError: Story = { args: { value: '', error: 'Enter a name.' } };

/** Not editable: dimmed. */
export const Disabled: Story = { args: { value: 'Retinol serum', editable: false } };

/** Decimal keyboard with a unit inside the field. */
export const PriceWithSuffix: Story = {
  args: { label: 'Price', placeholder: '0,00', hint: undefined, keyboard: 'decimal', suffix: '€' },
};

/** A leading icon and no label (search). */
export const Search: Story = {
  args: {
    label: undefined,
    hint: undefined,
    noHelper: true,
    placeholder: 'Search products',
    leadingIcon: 'search',
    accessibilityLabel: 'Search products',
  },
};

/** `type="password"`: hidden with no way to show it (PIN fallback). */
export const Password: Story = {
  args: { label: 'PIN', hint: undefined, type: 'password', keyboard: 'numeric', value: '1234' },
};

/** `secret`: hidden as typed, with an eye button that shows it (the recovery answer). */
export const Secret: Story = {
  args: { label: 'Answer', hint: 'Only you know this.', secret: true, value: 'Vilnius' },
};

/** Multiline grows from 96 to 160 pt, then scrolls. */
export const Multiline: Story = {
  args: {
    label: 'Notes',
    hint: undefined,
    multiline: true,
    value: 'Tingles for a minute after applying.\nKeep in the fridge.',
  },
};

/** Translated form fields; switch EN/LT in the toolbar. */
export const Translated: Story = {
  render: function Translated(args) {
    const { t } = useTranslation();
    return (
      <View>
        <Stateful
          {...args}
          label={t('products.form.name')}
          placeholder={t('products.form.namePlaceholder')}
          hint={undefined}
        />
        <Stateful
          {...args}
          label={t('products.form.size')}
          placeholder="50"
          hint={undefined}
          keyboard="numeric"
          suffix="ml"
        />
        <Stateful {...args} label={t('products.form.notes')} hint={undefined} multiline />
      </View>
    );
  },
};

/** A long Lithuanian label, value and error wrap or scroll without clipping the box. */
export const LongLithuanian: Story = {
  args: {
    label: 'Produkto pavadinimas, kaip parašyta ant buteliuko',
    value: 'Hialurono rūgšties drėkinamasis serumas su niacinamidu ir pantenoliu',
    error: 'Pavadinimas per ilgas: jis turi būti ne ilgesnis nei 60 simbolių.',
  },
};

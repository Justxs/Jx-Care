import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { withAppData } from '@/storybook/appData';

import { DateField, TimeField, type DateFieldProps } from './date-field';

/** Keeps its own value so a picked date shows; changes still reach Actions. */
function Stateful(props: DateFieldProps) {
  const [value, setValue] = useState(props.value);
  return (
    <DateField
      {...props}
      value={value}
      onChange={(day) => {
        setValue(day);
        props.onChange(day);
      }}
    />
  );
}

const meta = {
  title: 'UI/DateField',
  component: DateField,
  // Dates are formatted with the settings (read from a story database).
  decorators: [withAppData()],
  args: {
    label: 'Purchase date',
    placeholder: 'Pick a date',
    value: '2026-10-07',
    disabled: false,
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<DateFieldProps, 'onChange'>),
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    value: { control: 'text' },
    min: { control: 'text' },
    max: { control: 'text' },
    hint: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
    onChange: { action: 'changed' },
  },
  // Keyed on `value` so the Controls field resets the picked date.
  render: (args) => <Stateful key={args.value ?? ''} {...args} />,
} satisfies Meta<typeof DateField>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A date shown as "Today, 7 Oct". Tapping opens the system picker (Android) or a sheet (iOS). */
export const Filled: Story = {};

/** No date yet: the placeholder shows. */
export const Empty: Story = { args: { value: null } };

/** Only dates up to today can be picked (purchase and opened dates). */
export const WithMax: Story = {
  args: { value: '2026-09-30', max: '2026-10-07', hint: 'The day you bought it.' },
};

export const WithError: Story = { args: { value: null, error: 'Pick a date.' } };

export const Disabled: Story = { args: { disabled: true } };

/** TimeField: a time of day; the clock icon replaces the calendar. */
export const Time: Story = {
  render: function Time() {
    const { t } = useTranslation();
    const [morning, setMorning] = useState<string | null>('07:30');
    const [evening, setEvening] = useState<string | null>(null);
    return (
      <View className="gap-1">
        <TimeField label={t('common.morning')} value={morning} onChange={setMorning} />
        <TimeField
          label={t('common.evening')}
          placeholder="--:--"
          value={evening}
          onChange={setEvening}
        />
      </View>
    );
  },
};

/** Translated labels; the date format follows EN/LT. */
export const Translated: Story = {
  render: function Translated(args) {
    const { t } = useTranslation();
    return (
      <View className="gap-1">
        <Stateful {...args} label={t('products.form.purchasedAt')} value="2026-10-06" />
        <Stateful
          {...args}
          label={t('products.form.expiresAt')}
          hint={t('products.form.expiresAtHint')}
          value="2027-03-01"
        />
      </View>
    );
  },
};

/** A long Lithuanian label and hint wrap. */
export const LongLithuanian: Story = {
  args: {
    label: 'Ant pakuotės atspausdinta galiojimo pabaigos data',
    hint: 'Data, nurodyta ant pakuotės, jei ji yra. Jei datos nėra, palikite lauką tuščią.',
  },
};

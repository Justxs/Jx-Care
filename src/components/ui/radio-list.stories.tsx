import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from './icon';
import { RadioList, type RadioListProps } from './radio-list';

/** Keeps the choice so taps move the mark; a new `value` from Controls starts over. */
function StatefulRadioList(props: RadioListProps) {
  const [value, setValue] = useState(props.value);
  return (
    <RadioList
      {...props}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        props.onValueChange?.(v);
      }}
    />
  );
}

const meta = {
  title: 'UI/RadioList',
  component: RadioList,
  args: {
    items: [
      { value: 'lt', label: 'Lietuvių', detail: 'LT' },
      { value: 'en', label: 'English', detail: 'EN' },
    ],
    value: 'lt',
    accessibilityLabel: 'Language',
  },
  argTypes: {
    value: { control: 'text' },
    onValueChange: { action: 'changed' },
  },
  render: (args) => <StatefulRadioList key={args.value} {...args} />,
} satisfies Meta<typeof RadioList>;

export default meta;

// Typed from Meta, not `typeof meta`: the required callbacks come from the action argTypes,
// so stories needn't pass them.
type Story = StoryObj<Meta<typeof RadioList>>;

/** Language picker: a label with a detail line under it. */
export const WithDetails: Story = {};

/** Nothing chosen yet. */
export const NoSelection: Story = { args: { value: undefined } };

/** Translated options without details, as in the schedule picker. */
export const Schedule: Story = {
  render: function Schedule(args) {
    const { t } = useTranslation();
    return (
      <StatefulRadioList
        {...args}
        key={args.value}
        value="every"
        items={[
          { value: 'every', label: t('common.everyDay') },
          { value: 'days', label: t('common.setDays') },
          { value: 'interval', label: t('common.everyFewDays') },
        ]}
      />
    );
  },
};

/** A leading icon per row (time of day). */
export const WithLeadingIcons: Story = {
  render: function WithLeadingIcons(args) {
    const { t } = useTranslation();
    return (
      <StatefulRadioList
        {...args}
        key={args.value}
        value="morning"
        items={[
          { value: 'morning', label: t('common.morning'), lead: <Icon name="sun" tone="accent" /> },
          {
            value: 'evening',
            label: t('common.evening'),
            lead: <Icon name="moon" tone="accent" />,
          },
          { value: 'custom', label: t('common.custom'), lead: <Icon name="clock" tone="accent" /> },
        ]}
      />
    );
  },
};

/** Long Lithuanian labels and details wrap; the mark stays centred on the right. */
export const LongLithuanian: Story = {
  args: {
    value: 'a',
    items: [
      {
        value: 'a',
        label: 'Kas kelias dienas, pradedant nuo pirmo naudojimo',
        detail: 'Priminimas ateis ryte, jei rutina dar nebus atlikta',
      },
      {
        value: 'b',
        label: 'Pasirinktomis savaitės dienomis',
        detail: 'Pirmadienį, trečiadienį ir penktadienį',
      },
    ],
  },
};

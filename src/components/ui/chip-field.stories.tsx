import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChipField, type ChipFieldProps } from './chip-field';

/** Keeps its own value so tapping works; changes still reach Actions. */
function Stateful(props: ChipFieldProps) {
  const [value, setValue] = useState<string[]>([...props.value]);
  return (
    <ChipField
      {...props}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        props.onValueChange(next);
      }}
    />
  );
}

const pao = ['3', '6', '12', '24'];

const meta = {
  title: 'UI/ChipField',
  component: ChipField,
  args: {
    label: 'Period after opening',
    hint: 'The open-jar symbol on the pack: 12M means use within 12 months.',
    items: pao.map((m) => ({ value: m, label: `${m}M` })),
    value: ['12'],
    single: true,
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<ChipFieldProps, 'onValueChange'>),
  },
  argTypes: {
    label: { control: 'text' },
    hint: { control: 'text' },
    error: { control: 'text' },
    single: { control: 'boolean' },
    noHelper: { control: 'boolean' },
    onValueChange: { action: 'value changed' },
  },
  render: (args) => <Stateful {...args} />,
} satisfies Meta<typeof ChipField>;

export default meta;

type Story = StoryObj<typeof meta>;

/** PAO months: single choice with the hint in the reserved line. */
export const WithHint: Story = {};

export const Empty: Story = { args: { value: [] } };

/** The error replaces the hint in the same line, so nothing below moves. */
export const WithError: Story = {
  args: { value: [], single: false, label: 'Tags', hint: undefined, error: 'Pick at least one.' },
};

/** Translated condition tags, multiple choice. */
export const Translated: Story = {
  render: function Translated(args) {
    const { t } = useTranslation();
    return (
      <Stateful
        {...args}
        single={false}
        label={t('condition.sheet.tags.skin')}
        hint={undefined}
        items={(['calm', 'glow', 'oily', 'dry', 'breakout'] as const).map((v) => ({
          value: v,
          label: t(`common.tags.${v}`),
        }))}
        value={['glow']}
      />
    );
  },
};

/** A long Lithuanian label and hint wrap over lines. */
export const LongLithuanian: Story = {
  args: {
    label: 'Laikotarpis po atidarymo (mėnesiais)',
    hint: 'Atidaryto indelio simbolis ant pakuotės: 12M reiškia, kad produktą reikia sunaudoti per 12 mėnesių.',
  },
};

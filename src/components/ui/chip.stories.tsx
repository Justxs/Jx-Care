import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip, ChipGroup, type ChipProps } from './chip';
import { icons } from './icon';

const tagValues = ['calm', 'glow', 'oily', 'dry', 'breakout', 'redness', 'itchy'] as const;

/** Keeps its own selected state so tapping works; changes still reach Actions. */
function Stateful(props: ChipProps) {
  const [selected, setSelected] = useState(!!props.selected);
  return (
    <Chip
      {...props}
      selected={selected}
      onPressedChange={(next) => {
        setSelected(next);
        props.onPressedChange?.(next);
      }}
    />
  );
}

const meta = {
  title: 'UI/Chip',
  component: Chip,
  args: { children: 'Morning', selected: false, disabled: false },
  argTypes: {
    children: { control: 'text' },
    selected: { control: 'boolean' },
    disabled: { control: 'boolean' },
    icon: { control: 'select', options: [undefined, ...Object.keys(icons)] },
    count: { control: 'number' },
    tone: { control: 'radio', options: [undefined, 'danger'] },
    onPressedChange: { action: 'pressed changed' },
  },
  // Keyed on `selected` so the Controls toggle resets the tapped state.
  render: (args) => <Stateful key={String(args.selected)} {...args} />,
} satisfies Meta<typeof Chip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unselected: Story = {};

export const Selected: Story = { args: { selected: true } };

/** A filter chip with an icon and a count. */
export const IconAndCount: Story = { args: { selected: true, icon: 'check', count: 3 } };

/** The danger tone marks avoided ingredients. */
export const DangerSelected: Story = {
  args: { selected: true, tone: 'danger', icon: 'ban', children: 'Parfum' },
};

export const Disabled: Story = { args: { disabled: true } };

/** A long Lithuanian label stays on one pill and the row wraps. */
export const LongLithuanian: Story = {
  args: { children: 'Kas kelias dienas', icon: 'calendar', count: 12 },
};

/** ChipGroup, multiple choice: condition tags. */
export const GroupMultiple: Story = {
  render: function GroupMultiple() {
    const { t } = useTranslation();
    const [value, setValue] = useState<string[]>(['calm', 'dry']);
    return (
      <ChipGroup
        accessibilityLabel={t('condition.sheet.tags.skin')}
        items={tagValues.map((v) => ({ value: v, label: t(`common.tags.${v}`) }))}
        value={value}
        onValueChange={setValue}
      />
    );
  },
};

/** ChipGroup, single choice that can't be emptied: PAO months. */
export const GroupSingle: Story = {
  render: function GroupSingle() {
    const { t } = useTranslation();
    const [value, setValue] = useState<string[]>(['12']);
    return (
      <ChipGroup
        single
        allowEmpty={false}
        items={['3', '6', '12', '24'].map((m) => ({
          value: m,
          label: t('products.form.months', { count: Number(m) }),
        }))}
        value={value}
        onValueChange={setValue}
      />
    );
  },
};

/** ChipGroup with counts and the danger tone. */
export const GroupDangerWithCounts: Story = {
  render: function GroupDangerWithCounts() {
    const [value, setValue] = useState<string[]>(['parfum']);
    return (
      <View className="gap-3">
        <ChipGroup
          tone="danger"
          items={[
            { value: 'parfum', label: 'Parfum', icon: 'ban', count: 2 },
            { value: 'alcohol', label: 'Alcohol denat.', count: 1 },
            { value: 'sls', label: 'Sodium lauryl sulfate', count: 0 },
          ]}
          value={value}
          onValueChange={setValue}
        />
      </View>
    );
  },
};

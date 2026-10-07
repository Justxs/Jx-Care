import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ToggleGroup, type ToggleGroupProps } from './toggle-group';

/** Keeps the choice so taps slide the indicator; a new `value` from Controls starts over. */
function StatefulToggleGroup(props: ToggleGroupProps) {
  const [value, setValue] = useState(props.value);
  return (
    <ToggleGroup
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
  title: 'UI/ToggleGroup',
  component: ToggleGroup,
  args: {
    items: [
      { value: 'skin', label: 'Skin' },
      { value: 'hair', label: 'Hair' },
    ],
    value: 'skin',
    size: 'md',
    accessibilityLabel: 'Area',
  },
  argTypes: {
    value: { control: 'text' },
    size: { control: 'radio', options: ['md', 'sm'] },
    onValueChange: { action: 'changed' },
  },
  render: (args) => <StatefulToggleGroup key={args.value} {...args} />,
} satisfies Meta<typeof ToggleGroup>;

export default meta;

// Typed from Meta, not `typeof meta`: the required callbacks come from the action argTypes,
// so stories needn't pass them.
type Story = StoryObj<Meta<typeof ToggleGroup>>;

/** Two segments; the surface indicator slides behind the picked one. */
export const TwoItems: Story = {};

/** Translated segments with a count badge (Today's routine tabs). */
export const WithCounts: Story = {
  render: function WithCounts(args) {
    const { t } = useTranslation();
    return (
      <StatefulToggleGroup
        {...args}
        value="morning"
        items={[
          { value: 'morning', label: t('common.morning') },
          { value: 'evening', label: t('common.evening'), count: 4 },
          { value: 'custom', label: t('common.custom') },
        ]}
      />
    );
  },
};

/** Small, hugging its content, with icons (the story toolbar uses this). */
export const SmallWithIcons: Story = {
  args: {
    size: 'sm',
    value: 'list',
    items: [
      { value: 'list', label: 'List', icon: 'list' },
      { value: 'shelf', label: 'Shelf', icon: 'layout-grid' },
    ],
  },
};

/** A required choice with nothing picked yet: no indicator. */
export const NoSelection: Story = { args: { value: '' } };

/** Long Lithuanian labels cut to one line instead of growing the bar. */
export const LongLithuanian: Story = {
  args: {
    value: 'a',
    items: [
      { value: 'a', label: 'Rytinė rutina' },
      { value: 'b', label: 'Vakarinė rutina' },
      { value: 'c', label: 'Kita priežiūra' },
    ],
  },
};

import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Checkbox, type CheckboxProps } from './checkbox';
import { Text } from './text';

/** Keeps its own ticked state so tapping works; changes still reach Actions. */
function Stateful(props: CheckboxProps) {
  const [checked, setChecked] = useState(props.checked);
  return (
    <Checkbox
      {...props}
      checked={checked}
      onCheckedChange={(next) => {
        setChecked(next);
        props.onCheckedChange(next);
      }}
    />
  );
}

const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  args: {
    checked: false,
    disabled: false,
    accessibilityLabel: 'Cleanser',
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<CheckboxProps, 'onCheckedChange'>),
  },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    onCheckedChange: { action: 'checked changed' },
  },
  // Keyed on `checked` so the Controls toggle resets the tapped state.
  render: (args) => <Stateful key={String(args.checked)} {...args} />,
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

/** Ticking gives a light haptic. */
export const Checked: Story = { args: { checked: true } };

export const Disabled: Story = { args: { disabled: true } };

export const DisabledChecked: Story = { args: { disabled: true, checked: true } };

/** As in a routine step: the box beside the product it ticks off; long names wrap. */
export const WithLabels: Story = {
  render: (args) => (
    <View className="gap-3">
      {[
        'Cleanser',
        'Vitamin C serum',
        'Hialurono rūgšties drėkinamasis serumas su niacinamidu',
      ].map((name, i) => (
        <View key={name} className="flex-row items-center gap-3">
          <Stateful {...args} checked={i === 0} accessibilityLabel={name} />
          <Text className="flex-1 text-body">{name}</Text>
        </View>
      ))}
    </View>
  ),
};

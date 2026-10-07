import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { WeekdayDots } from './weekday-dots';
import { WeekdayPicker, type WeekdayPickerProps } from './weekday-picker';

/** Keeps the days so taps toggle them; new `value` from Controls starts over. */
function StatefulWeekdayPicker(props: WeekdayPickerProps) {
  const [days, setDays] = useState<readonly number[]>(props.value);
  return (
    <View className="gap-3">
      <WeekdayPicker
        {...props}
        value={days}
        onValueChange={(next) => {
          setDays(next);
          props.onValueChange?.(next);
        }}
      />
      <WeekdayDots value={days} />
    </View>
  );
}

const meta = {
  title: 'UI/WeekdayPicker',
  component: WeekdayPicker,
  args: { value: [1, 3, 5], accessibilityLabel: 'Days' },
  argTypes: {
    value: { control: 'object' },
    allowed: { control: 'object' },
    onValueChange: { action: 'changed' },
  },
  // The read-only dots under the picker show the same days.
  render: (args) => <StatefulWeekdayPicker key={JSON.stringify(args.value)} {...args} />,
} satisfies Meta<typeof WeekdayPicker>;

export default meta;

// Typed from Meta, not `typeof meta`: the required callbacks come from the action argTypes,
// so stories needn't pass them.
type Story = StoryObj<Meta<typeof WeekdayPicker>>;

/** Monday, Wednesday, Friday picked; letters follow EN/LT. */
export const SetDays: Story = {};

/** Nothing picked yet. */
export const NoDays: Story = { args: { value: [] } };

/** Every day. */
export const EveryDay: Story = { args: { value: [1, 2, 3, 4, 5, 6, 7] } };

/**
 * A step limited to its routine's days (Mon–Fri): weekend days are dashed and off. Saturday was
 * picked before the routine changed, so it stays tappable to be cleared.
 */
export const LimitedDays: Story = { args: { value: [1, 6], allowed: [1, 2, 3, 4, 5] } };

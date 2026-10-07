import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from './button';
import { ProgressRing } from './progress-ring';

const meta = {
  title: 'UI/ProgressRing',
  component: ProgressRing,
  args: { value: 2, max: 4 },
  argTypes: {
    value: { control: { type: 'number', min: 0, step: 1 } },
    max: { control: { type: 'number', min: 0, step: 1 } },
  },
} satisfies Meta<typeof ProgressRing>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Routine card: two of four steps done. */
export const Partial: Story = {};

/** Nothing done yet. */
export const Empty: Story = { args: { value: 0 } };

/** Complete: the arc and number turn `ok`. */
export const Complete: Story = { args: { value: 4 } };

/** Tap +1 to watch the arc animate (instant with Reduce Motion). */
export const Animates: Story = {
  render: function AnimatedRing(args) {
    const max = args.max ?? 1;
    const [value, setValue] = useState(0);
    return (
      <View className="flex-row items-center gap-4">
        <ProgressRing {...args} value={value} />
        <Button size="sm" block={false} onPress={() => setValue((v) => (v + 1) % (max + 1))}>
          +1
        </Button>
      </View>
    );
  },
};

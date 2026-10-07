import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from './button';
import { Progress } from './progress';

const meta = {
  title: 'UI/Progress',
  component: Progress,
  args: { value: 2, max: 4 },
  argTypes: {
    value: { control: { type: 'number', min: 0, step: 1 } },
    max: { control: { type: 'number', min: 0, step: 1 } },
  },
} satisfies Meta<typeof Progress>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Half way: the fill grows from the left. */
export const Half: Story = {};

/** Nothing yet: the track only. */
export const Empty: Story = { args: { value: 0 } };

/** Full. */
export const Complete: Story = { args: { value: 4 } };

/** Values past `max` clamp to full; `max` 0 shows empty. */
export const Clamped: Story = {
  render: () => (
    <View className="gap-4">
      <Progress value={7} max={4} />
      <Progress value={3} max={0} />
    </View>
  ),
};

/** Tap +1 to watch the fill animate with scaleX (instant with Reduce Motion). */
export const Animates: Story = {
  render: function Animates(args) {
    const max = args.max ?? 100;
    const [value, setValue] = useState(0);
    return (
      <View className="gap-4">
        <Progress {...args} value={value} />
        <Button size="sm" block={false} onPress={() => setValue((v) => (v + 1) % (max + 1))}>
          +1
        </Button>
      </View>
    );
  },
};

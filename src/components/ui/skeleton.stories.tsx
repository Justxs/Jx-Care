import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { Skeleton } from './skeleton';

const meta = {
  title: 'UI/Skeleton',
  component: Skeleton,
  args: { width: '100%', height: 16, radius: 8 },
  argTypes: {
    width: { control: 'text' },
    height: { control: { type: 'number', min: 4, max: 200, step: 2 } },
    radius: { control: { type: 'number', min: 0, max: 100, step: 2 } },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One text line; pulses unless Reduce Motion is on. */
export const Line: Story = {};

/** A 48 pt thumbnail. */
export const Thumb: Story = { args: { width: 48, height: 48 } };

/** A circle (a progress ring's place). */
export const Circle: Story = { args: { width: 44, height: 44, radius: 22 } };

/** A product row while the list loads: the same sizes as the row that replaces it. */
export const ListRow: Story = {
  render: () => (
    <View className="gap-4">
      {[0, 1, 2].map((i) => (
        <View key={i} className="flex-row items-center gap-3">
          <Skeleton width={48} height={48} radius={8} />
          <View className="flex-1 gap-2">
            <Skeleton height={16} />
            <Skeleton width="60%" height={14} />
          </View>
        </View>
      ))}
    </View>
  ),
};

/** A card's place on Today. */
export const Card: Story = { args: { height: 120, radius: 16 } };

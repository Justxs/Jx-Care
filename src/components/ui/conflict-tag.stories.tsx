import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { ConflictTag } from './conflict-tag';

const meta = {
  title: 'UI/ConflictTag',
  component: ConflictTag,
  args: { mild: false },
  argTypes: {
    mild: { control: 'boolean' },
    label: { control: 'text' },
    onPress: { action: 'pressed' },
  },
} satisfies Meta<typeof ConflictTag>;

export default meta;

type Story = StoryObj<typeof meta>;

/** "Conflict": amber with a triangle, never red. Pressable (opens "Why this warning"). */
export const Conflict: Story = {};

export const Mild: Story = { args: { mild: true } };

/** A custom word replaces "Conflict". */
export const CustomLabel: Story = { args: { label: 'Vitamin C + AHA' } };

/** Static: no onPress, so it is not a button. */
export const Static: Story = {
  argTypes: { onPress: { control: false } },
  render: () => (
    <View className="flex-row flex-wrap gap-2">
      <ConflictTag />
      <ConflictTag mild />
    </View>
  ),
};

/** A long Lithuanian word stays on one pill. */
export const LongLithuanian: Story = { args: { label: 'Švelnus nesuderinamumas' } };

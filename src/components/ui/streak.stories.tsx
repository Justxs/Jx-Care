import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { StreakCard, StreakChip } from './streak';

const meta = {
  title: 'UI/Streak',
  component: StreakChip,
  args: { area: 'skin', value: 12 },
  argTypes: {
    area: { control: 'radio', options: ['skin', 'hair'] },
    value: { control: { type: 'number', min: 0, step: 1 } },
    onPress: { action: 'pressed' },
  },
} satisfies Meta<typeof StreakChip>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Today's skin streak chip; tapping opens the explain sheet. */
export const SkinChip: Story = {};

/** The hair streak in its own tone. */
export const HairChip: Story = { args: { area: 'hair', value: 3 } };

/** No streak yet. */
export const ZeroChip: Story = { args: { value: 0 } };

/** Not tappable: read as one line, no button role. */
export const StaticChip: Story = {
  render: ({ onPress: _onPress, ...args }) => <StreakChip {...args} />,
};

/** Both chips side by side, as in the Today header; the chip widens for three digits. */
export const ChipRow: Story = {
  render: (args) => (
    <View className="flex-row gap-2">
      <StreakChip area="skin" value={128} onPress={args.onPress} />
      <StreakChip area="hair" value={7} onPress={args.onPress} />
    </View>
  ),
};

/** Half-width cards (Calendar): current streak large, best below. */
export const Cards: Story = {
  render: (args) => (
    <View className="flex-row gap-3">
      <StreakCard area="skin" value={12} best={21} onPress={args.onPress} />
      <StreakCard area="hair" value={4} best={4} onPress={args.onPress} />
    </View>
  ),
};

/** The streak broke and started again: the line under the number says so. */
export const CardRestarted: Story = {
  render: () => (
    <View className="flex-row gap-3">
      <StreakCard area="skin" value={1} best={21} restarted />
      <StreakCard area="hair" value={0} best={9} restarted />
    </View>
  ),
};

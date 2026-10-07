import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { AreaTag } from './area-tag';

const meta = {
  title: 'UI/AreaTag',
  component: AreaTag,
  args: { area: 'skin' },
  argTypes: { area: { control: 'radio', options: ['skin', 'hair', 'both'] } },
} satisfies Meta<typeof AreaTag>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Skin: Story = {};

export const Hair: Story = { args: { area: 'hair' } };

/** "Skin + hair" uses the skin colours; the word tells it apart. */
export const Both: Story = { args: { area: 'both' } };

/** All three side by side; switch EN/LT in the toolbar ("Oda + plaukai" is the longest). */
export const AllAreas: Story = {
  render: () => (
    <View className="flex-row flex-wrap gap-2">
      <AreaTag area="skin" />
      <AreaTag area="hair" />
      <AreaTag area="both" />
    </View>
  ),
};

import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { samplePhotoUri } from '@/storybook/seeds/ui-b';

import { PhotoTile } from './photo-tile';

const meta = {
  title: 'UI/PhotoTile',
  component: PhotoTile,
  // Tiles fill their grid column; a fixed width stands in for one here.
  args: { src: samplePhotoUri, date: '6 Oct', selected: false, add: false, className: 'w-[140px]' },
  argTypes: {
    src: { control: 'text' },
    date: { control: 'text' },
    selected: { control: 'boolean' },
    add: { control: 'boolean' },
    onPress: { action: 'pressed' },
  },
} satisfies Meta<typeof PhotoTile>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A progress photo with its date caption. */
export const Photo: Story = {};

/** Picked for Compare: accent border and a check. */
export const Selected: Story = { args: { selected: true } };

/** The image hasn't decoded (or the file is gone): the 3:4 box is kept. */
export const NoImage: Story = { args: { src: undefined } };

/** The dashed "Add photo" slot. */
export const AddSlot: Story = { args: { add: true, src: undefined, date: undefined } };

/** Not tappable: spoken as an image, not a button. */
export const ReadOnly: Story = {
  // Drops the logged onPress Storybook adds, so the tile has no press handler.
  render: ({ onPress: _onPress, ...args }) => <PhotoTile {...args} />,
};

/** The progress grid: tap tiles to select them, as in Compare. */
export const Grid: Story = {
  render: function Grid() {
    const [picked, setPicked] = useState<string[]>(['13 Oct']);
    const toggle = (date: string) =>
      setPicked((p) => (p.includes(date) ? p.filter((d) => d !== date) : [...p, date]));
    return (
      <View className="flex-row gap-3">
        {['6 Oct', '13 Oct'].map((date) => (
          <PhotoTile
            key={date}
            src={samplePhotoUri}
            date={date}
            selected={picked.includes(date)}
            onPress={() => toggle(date)}
            className="flex-1"
          />
        ))}
        <PhotoTile add onPress={() => {}} className="flex-1" />
      </View>
    );
  },
};

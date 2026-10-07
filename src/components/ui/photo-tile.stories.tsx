import type { Meta, StoryObj } from '@storybook/react-native';

import { samplePhotoUri } from '@/storybook/seeds/products';

import { PhotoTile } from './photo-tile';

const meta = {
  title: 'UI/PhotoTile',
  component: PhotoTile,
  // Tiles fill their grid column; a fixed width stands in for one here.
  args: { src: samplePhotoUri, date: '6 Oct', className: 'w-[140px]' },
  argTypes: {
    src: { control: 'text' },
    date: { control: 'text' },
    onPress: { action: 'pressed' },
  },
} satisfies Meta<typeof PhotoTile>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A progress photo with its date caption. */
export const Photo: Story = {};

/** The image hasn't decoded (or the file is gone): the 3:4 box is kept. */
export const NoImage: Story = { args: { src: undefined } };

/** Not tappable: spoken as an image, not a button. */
export const ReadOnly: Story = {
  // Drops the logged onPress Storybook adds, so the tile has no press handler.
  render: ({ onPress: _onPress, ...args }) => <PhotoTile {...args} />,
};

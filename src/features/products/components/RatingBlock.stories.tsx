import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { demoIds, seedDemo } from '@/storybook/fixtures';

import { RatingBlock } from './RatingBlock';

const meta = {
  title: 'Components/Products/RatingBlock',
  component: RatingBlock,
  args: { productId: demoIds.products.cleanser, rating: null, wouldRebuy: null },
  argTypes: {
    rating: { control: { type: 'range', min: 0, max: 5, step: 1 } },
    wouldRebuy: { control: 'select', options: [null, true, false] },
  },
  // Each tap saves to the story database at once.
  decorators: [withAppData({ seed: seedDemo })],
} satisfies Meta<typeof RatingBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Not rated yet: no stars and no Would buy again choice. */
export const Unrated: Story = {};

/** The retinol: 4 stars, would buy again. */
export const Rated: Story = {
  args: { productId: demoIds.products.retinol, rating: 4, wouldRebuy: true },
};

/** The clay mask: 2 stars, would not buy again. */
export const WouldNotRebuy: Story = {
  args: { productId: demoIds.products.clayMask, rating: 2, wouldRebuy: false },
};

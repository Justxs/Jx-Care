import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo } from '@/storybook/fixtures';
import { withPendingData } from '@/storybook/seeds/pending';
import { seedProgress } from '@/storybook/seeds/progress';

import { ProgressPhotosScreen } from './ProgressPhotosScreen';

const meta = {
  title: 'Screens/Calendar/Progress photos',
  component: ProgressPhotosScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ProgressPhotosScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * C3 skin album: "Take this week's photo", then one tile per week, newest first: last week,
 * a "No photo" week, a skipped week, a front-only week and the first week. Bundled images stand
 * in for the photos. Compare in the header; Skin / Hair because the hair album is on.
 */
export const Skin: Story = { decorators: [withAppData({ seed: seedProgress })] };

/** `?area=hair`: the hair album with last week's photos. */
export const Hair: Story = {
  decorators: [withAppData({ seed: seedProgress, params: { area: 'hair' } })],
};

/** No photos yet: the empty state with Take photo (no Compare, no album switch). */
export const Empty: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** Four skeleton tiles while the timeline loads. */
export const Loading: Story = {
  decorators: [withPendingData(), withAppData({ seed: seedDemo })],
};

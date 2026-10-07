import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo } from '@/storybook/fixtures';
import { progressWeeks, seedProgress } from '@/storybook/seeds/progress';

import { PhotoCompareScreen } from './PhotoCompareScreen';

const meta = {
  title: 'Screens/Modals/Compare',
  component: PhotoCompareScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PhotoCompareScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * C7 skin: "4 weeks ago vs now" (31 Aug week against last week), side by side or slider, the
 * angle switch (front, left, right) and pinch to zoom. Bundled images stand in for the photos.
 */
export const Skin: Story = {
  decorators: [withAppData({ seed: seedProgress, params: { area: 'skin' } })],
};

/** From Week detail's "Compare with…": After is the front-only week, so there's one angle. */
export const FromWeek: Story = {
  decorators: [
    withAppData({
      seed: seedProgress,
      params: { area: 'skin', after: progressWeeks.frontOnlyWeek },
    }),
  ],
};

/** Hair has only one week: "Two photos needed". */
export const NeedTwo: Story = {
  decorators: [withAppData({ seed: seedProgress, params: { area: 'hair' } })],
};

/** No photos at all. */
export const NoPhotos: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { area: 'skin' } })],
};

import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo } from '@/storybook/fixtures';
import { withPendingData } from '@/storybook/seeds/pending';
import { seedProgress, seedWeeklyPhotoOn } from '@/storybook/seeds/progress';

import { ProgressPhotosRow } from './ProgressPhotosRow';

const meta = {
  title: 'Components/Calendar/ProgressPhotosRow',
  component: ProgressPhotosRow,
} satisfies Meta<typeof ProgressPhotosRow>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Photos taken and Weekly photo on: "Last photo 4 Oct · next one Sunday". */
export const LastAndNext: Story = { decorators: [withAppData({ seed: seedProgress })] };

/** Weekly photo on, nothing taken yet: when the first one is due. */
export const NextOnly: Story = { decorators: [withAppData({ seed: seedWeeklyPhotoOn })] };

/** Weekly photo off and no photos: "No photos yet". */
export const NoPhotos: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** While the timeline loads: the row without its detail line. */
export const Loading: Story = {
  decorators: [withPendingData(), withAppData({ seed: seedDemo })],
};

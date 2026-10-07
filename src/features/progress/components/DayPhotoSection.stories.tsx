import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { FIXTURE_TODAY, seedDemo } from '@/storybook/fixtures';
import { progressWeeks, seedProgress } from '@/storybook/seeds/progress';

import { DayPhotoSection } from './DayPhotoSection';

const meta = {
  title: 'Components/Progress/DayPhotoSection',
  component: DayPhotoSection,
  args: { day: progressWeeks.lastWeekSkinDay },
} satisfies Meta<typeof DayPhotoSection>;

export default meta;

type Story = StoryObj<typeof meta>;

const progress = withAppData({ seed: seedProgress });

/** C2: "Skin photo, taken 4 Oct." with its thumbnail (a bundled image stands in). */
export const SkinPhoto: Story = { decorators: [progress] };

/** The hair album's photo on its day. */
export const HairPhoto: Story = {
  args: { day: progressWeeks.lastWeekHairDay },
  decorators: [progress],
};

/** A day without a photo: the section is hidden, so the canvas stays empty. */
export const NoPhoto: Story = {
  args: { day: FIXTURE_TODAY },
  decorators: [withAppData({ seed: seedDemo })],
};

import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedWeeklyPhotoOn } from '@/storybook/seeds/progress';

import { WeeklyPhotoRow } from './WeeklyPhotoRow';

const meta = {
  title: 'Components/Progress/WeeklyPhotoRow',
  component: WeeklyPhotoRow,
  decorators: [withAppData({ seed: seedWeeklyPhotoOn })],
} satisfies Meta<typeof WeeklyPhotoRow>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * T1 check-in's photo row: Take photo (logs the push to the camera) and "Skip this week", which
 * skips in the story database and shows the Undo toast.
 */
export const Default: Story = {};

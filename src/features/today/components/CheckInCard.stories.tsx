import type { Meta, StoryObj } from '@storybook/react-native';

import { WeeklyPhotoRow } from '@/features/progress/components/WeeklyPhotoRow';
import { withAppData } from '@/storybook/appData';
import { seedDemo } from '@/storybook/fixtures';

import { CheckInCard } from './CheckInCard';

const meta = {
  title: 'Components/Today/CheckInCard',
  component: CheckInCard,
  // The rows inside read today's condition log and this week's photo from the demo data.
  decorators: [withAppData({ seed: seedDemo })],
  args: { photo: null },
} satisfies Meta<typeof CheckInCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** "How's your skin today?" chips and Hair and note. */
export const SkinOnly: Story = {};

/** On the weekly photo day: the photo row above the chips. */
export const WithWeeklyPhoto: Story = { args: { photo: <WeeklyPhotoRow /> } };

import type { Meta, StoryObj } from '@storybook/react-native';

import { SkinCheckIn } from '@/features/condition/components/SkinCheckIn';
import { WeeklyPhotoRow } from '@/features/progress/components/WeeklyPhotoRow';
import { withAppData } from '@/storybook/appData';
import { seedDemo } from '@/storybook/fixtures';

import { CheckInCard } from './CheckInCard';

const meta = {
  title: 'Components/Today/CheckInCard',
  component: CheckInCard,
  // The rows inside read today's condition log and this week's photo from the demo data.
  decorators: [withAppData({ seed: seedDemo })],
  args: { photo: null, skin: <SkinCheckIn /> },
} satisfies Meta<typeof CheckInCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** "How's your skin today?" chips and Hair and note. */
export const SkinOnly: Story = {};

/** On the weekly photo day: the photo row above the chips. */
export const WithWeeklyPhoto: Story = { args: { photo: <WeeklyPhotoRow area="skin" /> } };

/** Nothing to check in: the card hides (blank canvas). */
export const Hidden: Story = { args: { skin: null } };

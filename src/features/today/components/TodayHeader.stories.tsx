import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { FIXTURE_TODAY, seedEmpty } from '@/storybook/fixtures';

import { TodayHeader, type TodayHeaderProps } from './TodayHeader';

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<TodayHeaderProps, 'onStreakPress'>;

const meta = {
  title: 'Components/Today/TodayHeader',
  component: TodayHeader,
  // The date is formatted with the settings' date format.
  decorators: [withAppData({ seed: seedEmpty })],
  args: {
    ...actions,
    day: FIXTURE_TODAY,
    skinStreak: { current: 5, best: 12 },
    hairStreak: null,
  },
  argTypes: {
    day: { control: 'text' },
    onStreakPress: { action: 'streak pressed' },
  },
} satisfies Meta<typeof TodayHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Greeting for the time now, the date and the skin streak chip (it counts up). */
export const SkinStreak: Story = {};

/** Skin and hair streak chips. */
export const BothStreaks: Story = { args: { hairStreak: { current: 3, best: 4 } } };

/** A routine exists but no day is finished yet: the chip shows 0. */
export const NewStreak: Story = { args: { skinStreak: { current: 0, best: 0 } } };

/** No routine yet: no chips. */
export const NoRoutine: Story = { args: { skinStreak: null } };

import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';
import {
  seedAllDone,
  seedPlayerProblems,
  seedSetupComplete,
  seedSetupStarted,
} from '@/storybook/seeds/routines';

import { TodayScreen } from './TodayScreen';

const meta = {
  title: 'Screens/Today/Today',
  component: TodayScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TodayScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * T1 on a busy Wednesday: a 5-day streak, morning half done, the A/B evening to pick, an expired
 * SPF (so Expiring soon moves up), the hair wash due and the skin check-in.
 */
export const Demo: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** Every routine finished: the cards collapse to ticked rows and the streak is 6. */
export const AllDone: Story = { decorators: [withAppData({ seed: seedAllDone })] };

/** A third, custom time of day with steps that need attention. */
export const ThreeRoutines: Story = { decorators: [withAppData({ seed: seedPlayerProblems })] };

/** First run (TodayFirstRunScreen): "Set up Jx-Care", 0 of 3, and the optional steps. */
export const FirstRun: Story = { decorators: [withAppData({ seed: seedEmpty })] };

/** First run with a product added: 1 of 3, Make a routine next. */
export const SetupStarted: Story = { decorators: [withAppData({ seed: seedSetupStarted })] };

/** All three setup steps done today: "You're set", with the new routine below. */
export const SetupComplete: Story = { decorators: [withAppData({ seed: seedSetupComplete })] };

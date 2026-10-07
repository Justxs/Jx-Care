import type { Meta, StoryObj } from '@storybook/react-native';

import { addDays } from '@/lib/appDay';
import { withAppData, type Seed } from '@/storybook/appData';
import { FIXTURE_TODAY, seedDemo, seedEmpty } from '@/storybook/fixtures';
import { seedDemoEarlier } from '@/storybook/seeds/calendar';
import { seedHairLateWash } from '@/storybook/seeds/hair';
import { withPendingData } from '@/storybook/seeds/pending';
import { progressWeeks, seedProgress } from '@/storybook/seeds/progress';

import { DayDetailScreen } from './DayDetailScreen';

const meta = {
  title: 'Screens/Calendar/Day detail',
  component: DayDetailScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DayDetailScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

const onDay = (day: string, seed: Seed = seedDemo) => withAppData({ seed, params: { day } });

/** C2 today: skin routines to tick, the wash due, "Log how your skin was". */
export const Today: Story = { decorators: [onDay(FIXTURE_TODAY)] };

/** Two days ago: routines done, nothing washed, the condition log and a retinol note. */
export const TwoDaysAgo: Story = { decorators: [onDay(addDays(FIXTURE_TODAY, -2))] };

/** Three days ago: the wash with its shampoo and note. */
export const WashDay: Story = { decorators: [onDay(addDays(FIXTURE_TODAY, -3))] };

/** A late wash today, two days after it was due. */
export const LateWash: Story = { decorators: [onDay(FIXTURE_TODAY, seedHairLateWash)] };

/** With weekly photos: the skin photo taken that day (4 Oct, also a wash day) opens its week. */
export const WithPhoto: Story = {
  decorators: [onDay(progressWeeks.lastWeekSkinDay, seedProgress)],
};

/** Twelve days ago, before any routine: only the first retinol note. */
export const DayWithNote: Story = { decorators: [onDay(addDays(FIXTURE_TODAY, -12))] };

/** Seven days ago, past the edit window: routines and the wash shown read-only. */
export const ReadOnlyDay: Story = {
  decorators: [onDay(addDays(FIXTURE_TODAY, -7), seedDemoEarlier(2))],
};

/** A day still to come: only what is planned. */
export const Future: Story = { decorators: [onDay(addDays(FIXTURE_TODAY, 2))] };

/** A fresh install: nothing due, nothing logged. */
export const Empty: Story = { decorators: [onDay(FIXTURE_TODAY, seedEmpty)] };

/** A link with a bad date. */
export const InvalidDay: Story = { decorators: [onDay('not-a-day')] };

/** While the sections load. */
export const Loading: Story = { decorators: [withPendingData(), onDay(FIXTURE_TODAY)] };

import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { progressWeeks, seedProgress } from '@/storybook/seeds/progress';

import { WeekDetailScreen } from './WeekDetailScreen';

const meta = {
  title: 'Screens/Calendar/Week detail',
  component: WeekDetailScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof WeekDetailScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

const week = (area: string, weekStart: string) =>
  withAppData({ seed: seedProgress, params: { area, weekStart } });

/**
 * C6 "Skin photo, 4 Oct": three angles to swipe (bundled images stand in), rated 4 with Calm and
 * Glow and a note, "What changed this week", Compare with…, Retake and the Delete menu.
 */
export const ThreeAngles: Story = { decorators: [week('skin', progressWeeks.lastWeek)] };

/** One photo, not rated, no tags or note. */
export const FrontOnly: Story = { decorators: [week('skin', progressWeeks.frontOnlyWeek)] };

/** The hair album's week: front, back and top. */
export const Hair: Story = { decorators: [week('hair', progressWeeks.lastWeek)] };

/** A week with no photos (skipped, or deleted elsewhere): "This photo is gone". */
export const NoPhotos: Story = { decorators: [week('skin', progressWeeks.skippedWeek)] };

/** A bad link. */
export const InvalidWeek: Story = { decorators: [week('skin', 'not-a-week')] };

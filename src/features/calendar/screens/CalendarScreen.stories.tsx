import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';
import { withPendingData } from '@/storybook/seeds/pending';
import { seedProgress } from '@/storybook/seeds/progress';

import { CalendarScreen } from './CalendarScreen';

const meta = {
  title: 'Screens/Calendar/Calendar',
  component: CalendarScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CalendarScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * C1 with the demo data: Skin, Hair and Condition views (switch at the top), October 2026.
 * Tapping a day logs the push to its Day detail.
 */
export const Demo: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** With weekly photos, so the photos row has a last and next date. */
export const WithPhotos: Story = { decorators: [withAppData({ seed: seedProgress })] };

/** A fresh install: no routines, nothing logged. */
export const Empty: Story = { decorators: [withAppData({ seed: seedEmpty })] };

/** While the data loads. */
export const Loading: Story = {
  decorators: [withPendingData(), withAppData({ seed: seedEmpty })],
};

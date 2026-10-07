import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { demoIds, seedDemo } from '@/storybook/fixtures';
import { withPendingData } from '@/storybook/seeds/pending';

import { HairDoneSheet } from './HairDoneSheet';

const meta = {
  title: 'Components/Hair/HairDoneSheet',
  component: HairDoneSheet,
  parameters: { layout: 'fullscreen' },
  args: { taskId: demoIds.hairTasks.wash },
  decorators: [withAppData({ seed: seedDemo })],
} satisfies Meta<typeof HairDoneSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * T3 for the wash: today's date, shampoo and conditioner picked, Add product and a note. Mark as
 * done saves to the story database and shows "Next wash: …" before closing (logged).
 */
export const Wash: Story = {};

/** Other care (trim): no products, only the date and a note. */
export const Trim: Story = { args: { taskId: demoIds.hairTasks.trim } };

/** A task that no longer exists. */
export const Missing: Story = { args: { taskId: 999 } };

/** While the task loads. */
export const Loading: Story = { decorators: [withPendingData()] };

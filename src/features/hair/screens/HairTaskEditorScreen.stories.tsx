import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { demoIds, seedDemo } from '@/storybook/fixtures';
import { withPendingData } from '@/storybook/seeds/pending';

import { HairTaskEditorScreen } from './HairTaskEditorScreen';

const meta = {
  title: 'Screens/Routines/Hair task editor',
  component: HairTaskEditorScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof HairTaskEditorScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** R5 `/routines/hair/new`: a new wash, every few days, last done today. */
export const New: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { id: 'new' } })],
};

/** Editing the demo wash: every 3 days with shampoo and conditioner, a 19:00 reminder. */
export const EditWash: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { id: String(demoIds.hairTasks.wash) } })],
};

/** Editing the trim: other care every 8 weeks, no products, no reminder. */
export const EditTrim: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { id: String(demoIds.hairTasks.trim) } })],
};

/** A task id that doesn't exist (deleted elsewhere). */
export const Missing: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { id: '999' } })],
};

/** Skeleton fields while the task loads. */
export const Loading: Story = {
  decorators: [
    withPendingData(),
    withAppData({ seed: seedDemo, params: { id: String(demoIds.hairTasks.wash) } }),
  ],
};

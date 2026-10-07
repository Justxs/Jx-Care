import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { demoIds, seedDemo } from '@/storybook/fixtures';

import { HairDoneScreen } from './HairDoneScreen';

const meta = {
  title: 'Screens/Modals/Hair task done',
  component: HairDoneScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof HairDoneScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** T3 at `/hair/done/1` (from Today's hair row or a hair reminder): the wash. */
export const Wash: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { taskId: String(demoIds.hairTasks.wash) } })],
};

/** `/hair/done/2`: the trim. */
export const Trim: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { taskId: String(demoIds.hairTasks.trim) } })],
};

/** A link with a bad id: "This task no longer exists". */
export const BadLink: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { taskId: 'oops' } })],
};

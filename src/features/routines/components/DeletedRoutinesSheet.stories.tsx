import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDeleted } from '@/storybook/seeds/routines';

import { DeletedRoutinesSheet, type DeletedRoutinesSheetProps } from './DeletedRoutinesSheet';

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<DeletedRoutinesSheetProps, 'onClose'>;

const meta = {
  title: 'Components/Routines/DeletedRoutinesSheet',
  component: DeletedRoutinesSheet,
  parameters: { layout: 'fullscreen' },
  args: { ...actions, open: true },
  argTypes: { onClose: { action: 'closed' } },
} satisfies Meta<typeof DeletedRoutinesSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Evening B, deleted two days ago. Restore puts it back on Routines and Today and closes. */
export const OneDeleted: Story = { decorators: [withAppData({ seed: seedDeleted })] };

import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';

import { StepProductPicker, type StepProductPickerProps } from './StepProductPicker';

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<StepProductPickerProps, 'onClose' | 'onPick'>;

const meta = {
  title: 'Components/Routines/StepProductPicker',
  component: StepProductPicker,
  parameters: { layout: 'fullscreen' },
  args: { ...actions, open: true },
  argTypes: {
    onClose: { action: 'closed' },
    onPick: { action: 'picked' },
  },
} satisfies Meta<typeof StepProductPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

/** "Pick another" in the player: skin products only. */
export const Demo: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** No products yet. */
export const Empty: Story = { decorators: [withAppData({ seed: seedEmpty })] };

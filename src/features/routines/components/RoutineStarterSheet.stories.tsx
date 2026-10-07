import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';

import { RoutineStarterSheet, type RoutineStarterSheetProps } from './RoutineStarterSheet';

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<RoutineStarterSheetProps, 'onClose'>;

const meta = {
  title: 'Components/Routines/RoutineStarterSheet',
  component: RoutineStarterSheet,
  parameters: { layout: 'fullscreen' },
  args: { ...actions, open: true, initialTimeOfDay: 'morning' },
  argTypes: {
    initialTimeOfDay: { control: 'radio', options: ['morning', 'evening'] },
    onClose: { action: 'closed' },
  },
} satisfies Meta<typeof RoutineStarterSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Morning templates, steps filled from the demo products. Create routine opens the editor. */
export const Morning: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** Opened on the evening side. */
export const Evening: Story = {
  args: { initialTimeOfDay: 'evening' },
  decorators: [withAppData({ seed: seedDemo })],
};

/** No products yet: every step says "Pick a product later" in amber. */
export const NoProducts: Story = { decorators: [withAppData({ seed: seedEmpty })] };

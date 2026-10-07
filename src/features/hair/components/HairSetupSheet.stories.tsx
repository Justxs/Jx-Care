import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedEmpty } from '@/storybook/fixtures';

import { HairSetupSheet, type HairSetupSheetProps } from './HairSetupSheet';

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<HairSetupSheetProps, 'onClose'>;

const meta = {
  title: 'Components/Hair/HairSetupSheet',
  component: HairSetupSheet,
  parameters: { layout: 'fullscreen' },
  args: { ...actions, open: true },
  argTypes: { open: { control: 'boolean' }, onClose: { action: 'closed' } },
  decorators: [withAppData({ seed: seedEmpty })],
} satisfies Meta<typeof HairSetupSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * R5 quick setup on a fresh install: every 3 days, last wash today, the live "Next wash" line and
 * Also track trims. "Other" logs a navigation to the full editor; Save writes to the story data.
 */
export const Open: Story = {};

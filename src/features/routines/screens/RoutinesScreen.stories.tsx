import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';
import { seedPlayerProblems } from '@/storybook/seeds/routines';

import { RoutinesScreen } from './RoutinesScreen';

const meta = {
  title: 'Screens/Routines/Routines',
  component: RoutinesScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RoutinesScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** R1 with a daily morning and an A/B evening (one with a conflict). */
export const Demo: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** No routines yet: the empty state with New routine. */
export const Empty: Story = { decorators: [withAppData({ seed: seedEmpty })] };

/** More routines: a custom time of day and three evening alternatives. */
export const ManyRoutines: Story = { decorators: [withAppData({ seed: seedPlayerProblems })] };

/** From Today's "Add a routine" (`?starter=1`): the starter sheet opens. */
export const StarterOpen: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { starter: '1' } })],
};

/** From Today's hair row (`?segment=hair`): the Hair side. */
export const Hair: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { segment: 'hair' } })],
};

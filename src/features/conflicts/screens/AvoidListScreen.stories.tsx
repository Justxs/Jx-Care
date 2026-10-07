import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';
import { seedLongNotes } from '@/storybook/seeds/settings';

import { AvoidListScreen } from './AvoidListScreen';

/** S4 Avoid list: what to avoid, with a note and a product count, then those products. */
const meta = {
  title: 'Screens/Settings/Avoid list',
  component: AvoidListScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AvoidListScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Parfum, in the conditioner and the finished clay mask. */
export const Demo: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** Nothing avoided yet. */
export const Empty: Story = { decorators: [withAppData({ seed: seedEmpty })] };

/** A second ingredient in no product, with a long Lithuanian note. */
export const LongNote: Story = { decorators: [withAppData({ seed: seedLongNotes })] };

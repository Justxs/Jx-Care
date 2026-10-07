import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo } from '@/storybook/fixtures';
import { seedConditionToday } from '@/storybook/seeds/condition';

import { SkinCheckIn } from './SkinCheckIn';

const meta = {
  title: 'Components/Condition/SkinCheckIn',
  component: SkinCheckIn,
} satisfies Meta<typeof SkinCheckIn>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Today's "How's your skin today?" with nothing picked; a tap saves at once. */
export const NothingYet: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** Already logged today: Oily and Breakout picked. */
export const Logged: Story = { decorators: [withAppData({ seed: seedConditionToday })] };

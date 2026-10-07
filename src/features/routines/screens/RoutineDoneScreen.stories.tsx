import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { demoIds } from '@/storybook/fixtures';
import {
  routineSeedIds,
  seedAllDone,
  seedMorningDone,
  seedPlayerProblems,
} from '@/storybook/seeds/routines';

import { RoutineDoneScreen } from './RoutineDoneScreen';

const r = demoIds.routines;

const meta = {
  title: 'Screens/Routines/Routine done',
  component: RoutineDoneScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RoutineDoneScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Morning done: the streak counts up from 5 to 6, then tonight's evening and the expired SPF. */
export const Morning: Story = {
  decorators: [
    withAppData({ seed: seedMorningDone, params: { routineId: String(r.morning), from: '5' } }),
  ],
};

/** The last routine of the day: next up is tomorrow morning. */
export const Evening: Story = {
  decorators: [
    withAppData({ seed: seedAllDone, params: { routineId: String(r.eveningA), from: '6' } }),
  ],
};

/** Opened without a streak to count from: the number shows at once. */
export const NoCountUp: Story = {
  decorators: [withAppData({ seed: seedMorningDone, params: { routineId: String(r.morning) } })],
};

/** A finished clay mask (already on the shopping list) and an expired SPF need attention. */
export const NeedsAttention: Story = {
  decorators: [
    withAppData({
      seed: seedPlayerProblems,
      params: { routineId: String(routineSeedIds.problems) },
    }),
  ],
};

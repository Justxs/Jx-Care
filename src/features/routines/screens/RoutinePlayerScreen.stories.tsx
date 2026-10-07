import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { demoIds, seedDemo } from '@/storybook/fixtures';
import { routineSeedIds, seedAllDone, seedPlayerProblems } from '@/storybook/seeds/routines';

import { RoutinePlayerScreen } from './RoutinePlayerScreen';

const r = demoIds.routines;

const meta = {
  title: 'Screens/Routines/Player',
  component: RoutinePlayerScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RoutinePlayerScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * T2 Morning, two of four ticked: tick vitamin C for the 1-minute wait bar. The expired SPF is
 * its own card, and vitamin C conflicts with tonight's glycolic toner.
 */
export const Morning: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { routineId: String(r.morning) } })],
};

/** The A evening, nothing ticked yet; a 2-minute wait after retinol. */
export const EveningA: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { routineId: String(r.eveningA) } })],
};

/** The B evening: its glycolic toner conflicts with the morning vitamin C. */
export const EveningConflict: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { routineId: String(r.eveningB) } })],
};

/** Steps that need attention: a finished product, a step with no product, an expired one. */
export const ProblemSteps: Story = {
  decorators: [
    withAppData({
      seed: seedPlayerProblems,
      params: { routineId: String(routineSeedIds.problems) },
    }),
  ],
};

/** Everything ticked (opened again from Today's done row). */
export const AllTicked: Story = {
  decorators: [withAppData({ seed: seedAllDone, params: { routineId: String(r.morning) } })],
};

/** A weekend-only routine opened on a Wednesday: "Not due today". */
export const NotDueToday: Story = {
  decorators: [
    withAppData({
      seed: seedPlayerProblems,
      params: { routineId: String(routineSeedIds.weekend) },
    }),
  ],
};

/** A routine that was deleted. */
export const Missing: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { routineId: '999' } })],
};

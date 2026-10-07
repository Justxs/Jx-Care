import type { Meta, StoryObj } from '@storybook/react-native';

import type { TodayRoutineGroup } from '@/features/routines/repo';
import { withAppData } from '@/storybook/appData';
import { FIXTURE_TODAY, seedDemo } from '@/storybook/fixtures';
import { seedAllDone, seedPlayerProblems } from '@/storybook/seeds/routines';

import { useToday } from '../api';
import { RoutineCard, type RoutineCardProps } from './RoutineCard';

/** The card for one of Today's groups ('morning', 'evening', 'custom:<name>'). */
function TodayGroupCard({ groupKey, ...props }: RoutineCardProps & { groupKey: string }) {
  const { groups } = useToday();
  const group = groups?.find((g) => g.key === groupKey);
  if (!group) return null;
  return <RoutineCard {...props} group={group} />;
}

/** Filled from the database by `TodayGroupCard`; never rendered as it is. */
const placeholder = {} as TodayRoutineGroup;

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<RoutineCardProps, 'onOpen' | 'onAllDone' | 'onChoose' | 'onAboutAB'>;

const meta = {
  title: 'Components/Today/RoutineCard',
  component: RoutineCard,
  args: { ...actions, group: placeholder, day: FIXTURE_TODAY, primary: true },
  argTypes: {
    primary: { control: 'boolean' },
    onOpen: { action: 'open player' },
    onAllDone: { action: 'all done' },
    onChoose: { action: 'choose' },
    onAboutAB: { action: 'about A/B' },
  },
  render: (args) => <TodayGroupCard {...args} groupKey="morning" />,
} satisfies Meta<typeof RoutineCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Morning, two of four ticked: Continue (the screen's one filled button), the expired SPF. */
export const InProgress: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** Not the first unfinished card: Continue is a secondary button. */
export const Secondary: Story = {
  args: { primary: false },
  decorators: [withAppData({ seed: seedDemo })],
};

/** A/B evening before the first tick: chips to pick tonight's option, a conflict tag. */
export const ChooseAB: Story = {
  args: { primary: false },
  decorators: [withAppData({ seed: seedDemo })],
  render: (args) => <TodayGroupCard {...args} groupKey="evening" />,
};

/** Finished: collapsed to a ticked row (still names the expired SPF). */
export const Done: Story = { decorators: [withAppData({ seed: seedAllDone })] };

/** Finished A/B evening: the row names the option done. */
export const DoneAB: Story = {
  decorators: [withAppData({ seed: seedAllDone })],
  render: (args) => <TodayGroupCard {...args} groupKey="evening" />,
};

/** A custom time of day whose products are finished, missing or expired. */
export const CustomTime: Story = {
  decorators: [withAppData({ seed: seedPlayerProblems })],
  render: (args) => <TodayGroupCard {...args} groupKey="custom:Afternoon" />,
};

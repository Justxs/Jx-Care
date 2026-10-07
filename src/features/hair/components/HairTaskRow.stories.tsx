import type { Meta, StoryObj } from '@storybook/react-native';

import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { withAppData } from '@/storybook/appData';
import { seedEmpty } from '@/storybook/fixtures';
import { hairRowFixtures } from '@/storybook/seeds/hair';

import { HairTaskRow, HairTaskRowSkeleton, type HairTaskRowProps } from './HairTaskRow';

const { wash, overdueWash, trim } = hairRowFixtures;

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<HairTaskRowProps, 'onPress'>;

const meta = {
  title: 'Components/Hair/HairTaskRow',
  component: HairTaskRow,
  args: { ...actions, task: wash },
  argTypes: { onPress: { action: 'pressed' } },
  decorators: [
    // Dates and words follow the app's settings and the fixed story day.
    withAppData({ seed: seedEmpty }),
    (Story) => (
      <Card flush>
        <Story />
      </Card>
    ),
  ],
} satisfies Meta<typeof HairTaskRow>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A wash due today: frequency and last wash on the left, "Due today" on the right. */
export const DueToday: Story = {};

/** Overdue: the due text turns `warning` ("Overdue 2 days"). */
export const Overdue: Story = {
  args: { task: overdueWash },
};

/** Other care every 8 weeks, next date on the right, with the scissors icon. */
export const Upcoming: Story = { args: { task: trim } };

/** Never done: "Not done yet" instead of a date. */
export const NeverDone: Story = { args: { task: { ...trim, lastDoneAt: null } } };

/** Set weekdays instead of an interval, and plain other care (no icon, names still line up). */
export const SetDays: Story = {
  args: {
    task: {
      ...trim,
      name: 'Scalp massage',
      otherKind: 'other',
      scheduleKind: 'days',
      daysOfWeek: [2, 5],
      everyNDays: null,
      intervalUnit: 'days',
    },
  },
};

/** A long Lithuanian name wraps; the due text keeps to 40% of the row. */
export const LongLithuanianName: Story = {
  args: {
    task: {
      ...wash,
      name: 'Plaukų plovimas su giliai valančiu šampūnu ir drėkinamuoju kondicionieriumi',
      state: 'overdue',
      overdueDays: 12,
    },
  },
};

/** The loading rows the list shows before its data. */
export const Skeleton: Story = {
  render: () => (
    <>
      <HairTaskRowSkeleton />
      <Separator className="ml-4" />
      <HairTaskRowSkeleton />
    </>
  ),
};

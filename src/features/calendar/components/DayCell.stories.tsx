import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { DayCell, type DayCellProps } from './DayCell';
import { DayMark } from './DayMark';

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<DayCellProps, 'onPress'>;

const meta = {
  title: 'Components/Calendar/DayCell',
  component: DayCell,
  args: {
    ...actions,
    day: '2026-10-05',
    inMonth: true,
    isToday: false,
    selected: false,
    mark: <DayMark status="done" />,
    accessibilityLabel: '5 October, done',
  },
  argTypes: {
    inMonth: { control: 'boolean' },
    isToday: { control: 'boolean' },
    selected: { control: 'boolean' },
    mark: { control: false },
    onPress: { action: 'pressed' },
  },
  // A cell takes a seventh of the grid's width.
  decorators: [
    (Story) => (
      <View className="w-[56px] flex-row">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof DayCell>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A done day in the month. */
export const Done: Story = {};

/** Today: the accent outline and a bold number. */
export const Today: Story = {
  args: { day: '2026-10-07', isToday: true, mark: <DayMark status="pending" /> },
};

/** The day that was tapped: a soft accent background, ink text. */
export const Selected: Story = {
  args: { day: '2026-10-06', selected: true, mark: <DayMark status="partly" /> },
};

/** A day from the next or previous month, drawn in `ink-muted`. */
export const OutsideMonth: Story = {
  args: { day: '2026-09-30', inMonth: false, mark: <DayMark status="missed" /> },
};

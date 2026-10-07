import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';
import { seedConditionToday } from '@/storybook/seeds/condition';
import { withPendingData } from '@/storybook/seeds/pending';

import { ConditionMonthView } from './ConditionMonthView';
import type { CalendarMonthProps } from './SkinCalendar';

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<CalendarMonthProps, 'onMonthChange' | 'onDayPress'>;

const meta = {
  title: 'Components/Calendar/ConditionMonthView',
  component: ConditionMonthView,
  parameters: { layout: 'fullscreen' },
  args: { ...actions, month: '2026-10', selectedDay: null },
  argTypes: {
    month: { control: 'text' },
    selectedDay: { control: 'text' },
    onMonthChange: { action: 'month changed' },
    onDayPress: { action: 'day pressed' },
  },
} satisfies Meta<typeof ConditionMonthView>;

export default meta;

type Story = StoryObj<typeof meta>;

/** C1 Condition view: bars on the three logged days ("+1" with two states), then the legend. */
export const Demo: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** Today logged too: Breakout's red bar with "+1". */
export const LoggedToday: Story = { decorators: [withAppData({ seed: seedConditionToday })] };

/** Nothing logged: no bars, only the legend. */
export const Empty: Story = { decorators: [withAppData({ seed: seedEmpty })] };

/** While the month loads. */
export const Loading: Story = {
  decorators: [withPendingData(), withAppData({ seed: seedEmpty })],
};

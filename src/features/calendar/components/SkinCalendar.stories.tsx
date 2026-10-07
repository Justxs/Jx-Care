import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';
import { withPendingData } from '@/storybook/seeds/pending';
import { seedProgress } from '@/storybook/seeds/progress';

import { SkinCalendar, type CalendarMonthProps } from './SkinCalendar';

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<CalendarMonthProps, 'onMonthChange' | 'onDayPress'>;

const meta = {
  title: 'Components/Calendar/SkinCalendar',
  component: SkinCalendar,
  parameters: { layout: 'fullscreen' },
  args: { ...actions, month: '2026-10', selectedDay: null },
  argTypes: {
    month: { control: 'text' },
    selectedDay: { control: 'text' },
    onMonthChange: { action: 'month changed' },
    onDayPress: { action: 'day pressed' },
  },
} satisfies Meta<typeof SkinCalendar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** C1 Skin view: the 5-day streak, done and partly done days, today partly done, photos row. */
export const Demo: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** The day just opened stays highlighted. */
export const SelectedDay: Story = {
  args: { selectedDay: '2026-10-04' },
  decorators: [withAppData({ seed: seedDemo })],
};

/** With weekly photos: the row says when the last one was taken and when the next is due. */
export const WithPhotos: Story = { decorators: [withAppData({ seed: seedProgress })] };

/** No routines yet: no streak card, an empty grid and "Your month fills in as you go". */
export const Empty: Story = { decorators: [withAppData({ seed: seedEmpty })] };

/** While the month loads: the streak card's skeleton, a grid with no marks. */
export const Loading: Story = {
  decorators: [withPendingData(), withAppData({ seed: seedEmpty })],
};

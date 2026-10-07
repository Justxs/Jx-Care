import type { Meta, StoryObj } from '@storybook/react-native';

import { WeekdayDots } from './weekday-dots';

const meta = {
  title: 'UI/WeekdayDots',
  component: WeekdayDots,
  args: { value: [1, 3, 5] },
  argTypes: { value: { control: 'object' } },
} satisfies Meta<typeof WeekdayDots>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Monday, Wednesday, Friday: the routine card's schedule preview. Letters follow EN/LT. */
export const SetDays: Story = {};

/** Every day; spoken as "Every day". */
export const EveryDay: Story = { args: { value: [1, 2, 3, 4, 5, 6, 7] } };

/** Weekends only. */
export const Weekend: Story = { args: { value: [6, 7] } };

/** No days picked. */
export const NoDays: Story = { args: { value: [] } };

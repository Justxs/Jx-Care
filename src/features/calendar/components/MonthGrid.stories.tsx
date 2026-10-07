import type { Meta, StoryObj } from '@storybook/react-native';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import type { SkinDayStatus } from '@/lib/streak';
import { FIXTURE_TODAY } from '@/storybook/fixtures';

import { dayCellLabel } from '../labels';
import { DayMark } from './DayMark';
import { MonthGrid, type MonthGridProps } from './MonthGrid';

/** A few weeks of skin days up to FIXTURE_TODAY (Wednesday 7 Oct 2026). */
const statuses: Record<string, SkinDayStatus> = {
  '2026-09-24': 'done',
  '2026-09-25': 'missed',
  '2026-09-26': 'partly',
  '2026-09-27': 'done',
  '2026-09-28': 'done',
  '2026-09-29': 'done',
  '2026-09-30': 'partly',
  '2026-10-01': 'missed',
  '2026-10-02': 'done',
  '2026-10-03': 'done',
  '2026-10-04': 'done',
  '2026-10-05': 'done',
  '2026-10-06': 'done',
  '2026-10-07': 'partly',
};

const renderMark = (day: string): ReactNode => <DayMark status={statuses[day]} />;

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<MonthGridProps, 'onMonthChange' | 'onDayPress'>;

const meta = {
  title: 'Components/Calendar/MonthGrid',
  component: MonthGrid,
  args: {
    ...actions,
    month: '2026-10',
    today: FIXTURE_TODAY,
    selectedDay: null,
    renderMark,
    dayLabel: (day: string) => day,
  },
  argTypes: {
    month: { control: 'text' },
    selectedDay: { control: 'text' },
    renderMark: { control: false },
    dayLabel: { control: false },
    onMonthChange: { action: 'month changed' },
    onDayPress: { action: 'day pressed' },
  },
  // The grid follows its `month` prop; the story keeps it in state so the arrows, swipe and
  // Today work, and the spoken labels follow the language switch.
  render: function Grid(args) {
    const { t } = useTranslation();
    const [month, setMonth] = useState(args.month);
    const [selected, setSelected] = useState(args.selectedDay);
    return (
      <Card className="p-3">
        <MonthGrid
          {...args}
          month={month}
          selectedDay={selected}
          onMonthChange={(m) => {
            setMonth(m);
            args.onMonthChange?.(m);
          }}
          onDayPress={(day) => {
            setSelected(day);
            args.onDayPress?.(day);
          }}
          dayLabel={(day) => dayCellLabel(t, day, args.today, statuses[day])}
        />
      </Card>
    );
  },
} satisfies Meta<typeof MonthGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

/** October 2026 with today outlined; 6 rows always, Monday first. */
export const CurrentMonth: Story = {};

/** A tapped day stays highlighted. */
export const WithSelectedDay: Story = { args: { selectedDay: '2026-10-02' } };

/** Another month: "Today" appears to come back to October. */
export const PreviousMonth: Story = { args: { month: '2026-09' } };

/** A month with no marks at all. */
export const NoMarks: Story = { args: { month: '2026-12', renderMark: () => null } };

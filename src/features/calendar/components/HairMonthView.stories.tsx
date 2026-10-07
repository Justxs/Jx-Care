import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { HairDayMark } from '@/lib/hair';
import { withAppData } from '@/storybook/appData';
import { FIXTURE_TODAY, seedDemo, seedEmpty } from '@/storybook/fixtures';
import { seedHairLateWash, seedHairOverdue } from '@/storybook/seeds/hair';
import { withPendingData } from '@/storybook/seeds/pending';

import { HairDayMarkView, HairMonthView, hairDayLabel } from './HairMonthView';
import type { CalendarMonthProps } from './SkinCalendar';

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<CalendarMonthProps, 'onMonthChange' | 'onDayPress'>;

const meta = {
  title: 'Components/Calendar/HairMonthView',
  component: HairMonthView,
  parameters: { layout: 'fullscreen' },
  args: { ...actions, month: '2026-10', selectedDay: null },
  argTypes: {
    month: { control: 'text' },
    selectedDay: { control: 'text' },
    onMonthChange: { action: 'month changed' },
    onDayPress: { action: 'day pressed' },
  },
} satisfies Meta<typeof HairMonthView>;

export default meta;

type Story = StoryObj<typeof meta>;

/** C1 Hair view: the hair streak, washes done every 3 days, the next ones due as rings. */
export const Demo: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** A missed wash: the due day is a dashed `warning` ring. */
export const Overdue: Story = { decorators: [withAppData({ seed: seedHairOverdue })] };

/** A wash done late today: the dot in a `warning` ring. */
export const LateWash: Story = { decorators: [withAppData({ seed: seedHairLateWash })] };

/** No hair tasks: no streak card, an empty grid and the hair empty text. */
export const Empty: Story = { decorators: [withAppData({ seed: seedEmpty })] };

/** While the month loads. */
export const Loading: Story = {
  decorators: [withPendingData(), withAppData({ seed: seedDemo })],
};

const marks: [string, HairDayMark][] = [
  ['wash done', { washDone: true, washLate: false, washDue: false, overdue: false, otherCare: [] }],
  ['wash late', { washDone: false, washLate: true, washDue: false, overdue: false, otherCare: [] }],
  ['wash due', { washDone: false, washLate: false, washDue: true, overdue: false, otherCare: [] }],
  ['overdue', { washDone: false, washLate: false, washDue: false, overdue: true, otherCare: [] }],
  [
    'wash + trim + colour',
    {
      washDone: true,
      washLate: false,
      washDue: false,
      overdue: false,
      otherCare: ['trim', 'colour'],
    },
  ],
  [
    'mask + other',
    {
      washDone: false,
      washLate: false,
      washDue: false,
      overdue: false,
      otherCare: ['mask', 'other'],
    },
  ],
];

/** Every hair day mark (`HairDayMarkView`) with its spoken label. */
export const DayMarks: Story = {
  render: function DayMarks() {
    const { t } = useTranslation();
    return (
      <Card className="m-4">
        <View className="gap-4">
          {marks.map(([name, mark]) => (
            <View key={name} className="flex-row items-center gap-3">
              <View className="w-[48px] items-center">
                <HairDayMarkView mark={mark} />
              </View>
              <Text className="flex-1 text-body">
                {hairDayLabel(t, '2026-10-05', FIXTURE_TODAY, mark)}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    );
  },
};

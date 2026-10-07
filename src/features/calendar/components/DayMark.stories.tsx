import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/text';
import type { SkinDayStatus } from '@/lib/streak';

import { DayMark } from './DayMark';

const statuses: SkinDayStatus[] = ['done', 'partly', 'missed', 'pending', 'none'];

const meta = {
  title: 'Components/Calendar/DayMark',
  component: DayMark,
  args: { status: 'done' },
  argTypes: { status: { control: 'select', options: statuses } },
} satisfies Meta<typeof DayMark>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Every routine due that day done: a filled accent dot. */
export const Done: Story = {};

/** Some steps ticked: a half-filled dot. */
export const Partly: Story = { args: { status: 'partly' } };

/** Nothing done on a past day: a grey ring. */
export const Missed: Story = { args: { status: 'missed' } };

/** Today with nothing yet, or no routine due: nothing drawn, the 12 pt space kept. */
export const Pending: Story = { args: { status: 'pending' } };

/** Every status with its word (shape and colour differ, never colour alone). */
export const AllStatuses: Story = {
  render: function AllStatuses() {
    const { t } = useTranslation();
    return (
      <View className="gap-3">
        {statuses.map((status) => (
          <View key={status} className="flex-row items-center gap-3">
            <DayMark status={status} />
            <Text className="text-body">
              {status === 'none' ? '—' : t(`calendar.day.status.${status}`)}
            </Text>
          </View>
        ))}
      </View>
    );
  },
};

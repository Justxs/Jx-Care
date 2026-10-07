import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { withAppData } from '@/storybook/appData';
import { demoIds, seedDemo } from '@/storybook/fixtures';

import { RoutineCard, RoutineCardSkeleton, type RoutineCardProps } from './RoutineCard';

const everyDay = [1, 2, 3, 4, 5, 6, 7];

const morning: RoutineCardProps['routine'] = {
  id: demoIds.routines.morning,
  name: 'Morning',
  daysOfWeek: everyDay,
  reminderTime: '07:30',
  stepCount: 4,
  active: true,
};

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<
  RoutineCardProps,
  'onPress' | 'onStart' | 'onActiveChange' | 'onDuplicate' | 'onDelete'
>;

const meta = {
  title: 'Components/Routines/RoutineCard',
  component: RoutineCard,
  // The conflict tag reads the routine's conflicts from the demo data.
  decorators: [withAppData({ seed: seedDemo })],
  args: { ...actions, routine: morning },
  argTypes: {
    onPress: { action: 'pressed' },
    onStart: { action: 'start' },
    onActiveChange: { action: 'active changed' },
    onDuplicate: { action: 'duplicate' },
    onDelete: { action: 'delete' },
  },
} satisfies Meta<typeof RoutineCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Every day, a reminder, four steps. Long press opens Duplicate and Delete. */
export const Morning: Story = {};

/** Its glycolic toner conflicts with the morning vitamin C: the conflict tag shows. */
export const WithConflict: Story = {
  args: {
    routine: {
      id: demoIds.routines.eveningB,
      name: 'Exfoliating night',
      daysOfWeek: everyDay,
      reminderTime: null,
      stepCount: 3,
      active: true,
    },
  },
};

/** Switched off: the text turns muted. */
export const Off: Story = { args: { routine: { ...morning, active: false } } };

/** Some days only, no reminder, one step. */
export const SomeDays: Story = {
  args: { routine: { ...morning, daysOfWeek: [1, 3, 5], reminderTime: null, stepCount: 1 } },
};

/** A long name wraps. */
export const LongName: Story = {
  args: { routine: { ...morning, name: 'Švelni rytinė priežiūra jautriai ir sausai odai' } },
};

/** While the list loads: cards at their final size. */
export const Skeleton: Story = {
  render: () => (
    <View className="gap-3">
      <RoutineCardSkeleton />
      <RoutineCardSkeleton />
    </View>
  ),
};

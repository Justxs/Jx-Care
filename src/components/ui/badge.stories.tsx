import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { Badge, type BadgeStatus } from './badge';

const statuses: BadgeStatus[] = ['ok', 'expiring', 'expired', 'unopened', 'nodate', 'avoid'];

const meta = {
  title: 'UI/Badge',
  component: Badge,
  args: { status: 'expiring' },
  argTypes: {
    status: { control: 'select', options: statuses },
    children: { control: 'text' },
  },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Expiring: Story = {};

/** A custom word replaces the status word ("Expired 2 Oct"). */
export const CustomWord: Story = { args: { status: 'expired', children: 'Expired 2 Oct' } };

/** Every status with its own word, never colour alone. */
export const AllStatuses: Story = {
  render: () => (
    <View className="gap-2">
      {statuses.map((status) => (
        <Badge key={status} status={status} />
      ))}
    </View>
  ),
};

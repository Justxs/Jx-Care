import type { Meta, StoryObj } from '@storybook/react-vite';

import { AreaTag, ConflictTag, StatusBadge, Tag } from './badges';

const meta = {
  title: 'Components/Badges',
  component: StatusBadge,
  args: { status: 'ok', children: 'OK' },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Status: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="ok">OK</StatusBadge>
      <StatusBadge status="expiring">Expiring soon</StatusBadge>
      <StatusBadge status="expired">Expired</StatusBadge>
      <StatusBadge status="unopened">Not opened</StatusBadge>
    </div>
  ),
};

export const Areas: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <AreaTag area="skin">Skin</AreaTag>
      <AreaTag area="hair">Hair</AreaTag>
      <AreaTag area="both">Skin + hair</AreaTag>
    </div>
  ),
};

export const Conflict: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <ConflictTag>Conflict</ConflictTag>
      <ConflictTag>Mild conflict</ConflictTag>
      <Tag>Sample data</Tag>
    </div>
  ),
};

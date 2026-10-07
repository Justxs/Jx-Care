import type { Meta, StoryObj } from '@storybook/react-vite';

import { Brand, BrandMark } from './brand';

const meta = {
  title: 'Components/Brand',
  component: Brand,
} satisfies Meta<typeof Brand>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inline: Story = {};

export const Stacked: Story = { args: { stacked: true, size: 'lg' } };

export const OnTheBand: Story = {
  render: () => (
    <div className="rounded-lg bg-hero p-6 on-hero">
      <Brand markClassName="text-hero-ink" />
    </div>
  ),
};

export const MarkOnly: Story = {
  render: () => <BrandMark title="Jx Care" className="h-24" />,
};

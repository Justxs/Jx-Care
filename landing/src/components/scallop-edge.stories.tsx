import type { Meta, StoryObj } from '@storybook/react-vite';

import { ScallopEdge } from './scallop-edge';

const meta = {
  title: 'Components/ScallopEdge',
  component: ScallopEdge,
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="bg-canvas pb-16">
      <div className="relative isolate h-32 bg-hero">
        <ScallopEdge />
      </div>
    </div>
  ),
} satisfies Meta<typeof ScallopEdge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnTheBand: Story = {};

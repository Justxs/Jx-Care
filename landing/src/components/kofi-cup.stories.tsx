import type { Meta, StoryObj } from '@storybook/react-vite';

import { KofiCup } from './kofi-cup';

const meta = {
  title: 'Components/KofiCup',
  component: KofiCup,
  args: { className: 'size-12' },
} satisfies Meta<typeof KofiCup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};

export const Dark: Story = { globals: { theme: 'dark' } };

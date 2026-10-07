import type { Meta, StoryObj } from '@storybook/react-vite';

import { NotFoundPage } from './not-found-page';

const meta = {
  title: 'Landing/Not found page',
  component: NotFoundPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof NotFoundPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const English: Story = {};

export const Lithuanian: Story = { globals: { locale: 'lt' } };

export const Dark: Story = { globals: { theme: 'dark' } };

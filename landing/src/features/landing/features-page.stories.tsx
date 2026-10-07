import type { Meta, StoryObj } from '@storybook/react-vite';

import { FeaturesPage } from './features-page';

const meta = {
  title: 'Landing/Features page',
  component: FeaturesPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof FeaturesPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const English: Story = {};

export const Lithuanian: Story = { globals: { locale: 'lt' } };

export const Dark: Story = { globals: { theme: 'dark' } };

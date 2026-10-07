import type { Meta, StoryObj } from '@storybook/react-vite';

import { LandingPage } from './landing-page';

const meta = {
  title: 'Landing/Page',
  component: LandingPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LandingPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const English: Story = {};

export const Lithuanian: Story = { globals: { locale: 'lt' } };

export const Dark: Story = { globals: { theme: 'dark' } };

export const Phone: Story = { globals: { viewport: { value: 'mobile1' } } };

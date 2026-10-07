import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowDown, ArrowUpRight } from 'lucide-react';

import { buttonClasses } from './button';
import { CheckMark } from './check-mark';
import { LanguageToggle } from './language-toggle';
import { ThemeToggle } from './theme-toggle';

const meta = {
  title: 'Components/Controls',
  component: CheckMark,
  args: { checked: true },
} satisfies Meta<typeof CheckMark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Buttons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <a href="#features" className={buttonClasses({ size: 'lg' })}>
        See what's inside
        <ArrowDown aria-hidden="true" />
      </a>
      <a href="#source" className={buttonClasses({ variant: 'outline', size: 'lg' })}>
        See it on GitHub
        <ArrowUpRight aria-hidden="true" />
      </a>
    </div>
  ),
};

export const OnTheBand: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-hero p-6 on-hero">
      <a href="#features" className={buttonClasses({ size: 'lg' })}>
        See what's inside
      </a>
      <a href="#source" className={buttonClasses({ variant: 'outline', size: 'lg' })}>
        See it on GitHub
      </a>
      <LanguageToggle />
      <ThemeToggle />
    </div>
  ),
};

export const Checkboxes: Story = {
  render: () => (
    <div className="flex gap-3">
      <CheckMark checked={false} />
      <CheckMark checked />
    </div>
  ),
};

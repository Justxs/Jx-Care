import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo } from '@/storybook/fixtures';
import { seedRemindersAllOn, seedRemindersOff, withPhoneSandbox } from '@/storybook/seeds/settings';

import { RemindersScreen } from './RemindersScreen';

/**
 * S5 Reminders. Every change saves to the story database and re-plans notifications on an
 * in-memory scheduler (`withPhoneSandbox`), so nothing is scheduled on the phone.
 */
const meta = {
  title: 'Screens/Settings/Reminders',
  component: RemindersScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RemindersScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Expiry reminders on (30 days before, 09:00), the weekly photo off. */
export const Demo: Story = {
  decorators: [withPhoneSandbox(), withAppData({ seed: seedDemo })],
};

/** Everything on, with the weekly photo's day and time open. */
export const AllOn: Story = {
  decorators: [withPhoneSandbox(), withAppData({ seed: seedRemindersAllOn })],
};

/** Everything off: the sections close up. */
export const AllOff: Story = {
  decorators: [withPhoneSandbox(), withAppData({ seed: seedRemindersOff })],
};

/**
 * Notifications are off in phone settings: the amber card, and each switch shows its saved state
 * as "Paused" or "Off".
 */
export const PermissionOff: Story = {
  decorators: [withPhoneSandbox({ notifications: 'denied' }), withAppData({ seed: seedDemo })],
};

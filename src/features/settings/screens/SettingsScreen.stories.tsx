import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';
import {
  pinSet,
  seedRecentBackup,
  withoutReset,
  withPhoneSandbox,
} from '@/storybook/seeds/settings';

import { SettingsScreen } from './SettingsScreen';

/**
 * S1 Settings. Rows push their screens (logged). Reset app asks for the PIN (2580, in the story's
 * in-memory secure storage), then shows the real counts; the last tap fails on purpose in a story
 * (`withoutReset`), so the phone's data is never deleted.
 */
const meta = {
  title: 'Screens/Settings/Settings',
  component: SettingsScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SettingsScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Demo data with no backup yet: "Never". */
export const Demo: Story = {
  decorators: [withPhoneSandbox({ secure: pinSet }), withAppData({ seed: withoutReset(seedDemo) })],
};

/** A backup two days ago, shown by date. */
export const RecentBackup: Story = {
  decorators: [
    withPhoneSandbox({ secure: pinSet }),
    withAppData({ seed: withoutReset(seedRecentBackup) }),
  ],
};

/** A fresh install right after onboarding. */
export const Fresh: Story = {
  decorators: [
    withPhoneSandbox({ secure: pinSet }),
    withAppData({ seed: withoutReset(seedEmpty) }),
  ],
};

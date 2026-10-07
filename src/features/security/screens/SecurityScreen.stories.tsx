import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo } from '@/storybook/fixtures';
import { seedBiometricsOn } from '@/storybook/seeds/settings';

import { SecurityScreen } from './SecurityScreen';

/**
 * S6 PIN and security. The Face ID / fingerprint row shows only when the phone running Storybook
 * offers biometrics (it asks the phone, which never touches the PIN). Turning it on opens the
 * phone's real prompt; the setting itself goes to the story database.
 */
const meta = {
  title: 'Screens/Settings/Security',
  component: SecurityScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SecurityScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Biometrics off, auto-lock after 1 minute (the defaults). */
export const Default: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** Biometrics on and auto-lock "Immediately". */
export const BiometricsOn: Story = { decorators: [withAppData({ seed: seedBiometricsOn })] };

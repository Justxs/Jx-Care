import type { Meta, StoryObj } from '@storybook/react-native';

import {
  pinLockedShort,
  pinSet,
  pinSetLongQuestion,
  withPhoneSandbox,
} from '@/storybook/seeds/settings';

import { ChangeRecoveryScreen } from './ChangeRecoveryScreen';

/**
 * S6 Recovery question: the PIN first (2580, in the story's in-memory secure storage), then the
 * O4 form with the saved question picked and an empty answer. Saving changes it in memory only.
 */
const meta = {
  title: 'Screens/Settings/Recovery question',
  component: ChangeRecoveryScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ChangeRecoveryScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Asks for the PIN; type 2580 to see the form with "first pet" picked. */
export const Preset: Story = { decorators: [withPhoneSandbox({ secure: pinSet })] };

/** Type 2580: the form opens on "Write my own" with a long Lithuanian question. */
export const OwnQuestion: Story = {
  decorators: [withPhoneSandbox({ secure: pinSetLongQuestion })],
};

/** The lock screen's lockout is running: the PIN step waits with a countdown. */
export const LockedOut: Story = { decorators: [withPhoneSandbox({ secure: pinLockedShort })] };

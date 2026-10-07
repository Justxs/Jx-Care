import type { Meta, StoryObj } from '@storybook/react-native';

import { pinLockedShort, pinSet, withPhoneSandbox } from '@/storybook/seeds/settings';

import { ChangePinScreen } from './ChangePinScreen';

/**
 * S6 Change PIN: the current PIN, a new one, then the same again. The PINs live in the story's
 * in-memory secure storage: 2580 is the current PIN, and saving changes it there, not on the
 * phone.
 */
const meta = {
  title: 'Screens/Settings/Change PIN',
  component: ChangePinScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ChangePinScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Step 1, "Enter your current PIN". */
export const CurrentPin: Story = { decorators: [withPhoneSandbox({ secure: pinSet })] };

/** The lock screen's lockout is running: the keypad waits with a countdown. */
export const LockedOut: Story = { decorators: [withPhoneSandbox({ secure: pinLockedShort })] };

import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo } from '@/storybook/fixtures';
import {
  pinLockedLong,
  pinLockedShort,
  pinSet,
  seedBiometricsOn,
  withPhoneSandbox,
} from '@/storybook/seeds/settings';

import { LockScreen, type LockScreenProps } from './LockScreen';

/**
 * L1 Lock screen. The PIN lives in the story's in-memory secure storage (`withPhoneSandbox`):
 * 2580 is right (the app is already unlocked, so nothing changes on screen); any other PIN shakes
 * and counts toward the lockout there, never on the phone.
 */
const meta = {
  title: 'Screens/Lock/Lock',
  component: LockScreen,
  parameters: { layout: 'fullscreen' },
  args: {
    covered: false,
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<LockScreenProps, 'onForgot'>),
  },
  argTypes: {
    covered: { control: 'boolean' },
    onForgot: { action: 'forgot PIN' },
  },
} satisfies Meta<typeof LockScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Enter PIN with the keypad ready. */
export const Default: Story = {
  decorators: [withPhoneSandbox({ secure: pinSet }), withAppData({ seed: seedDemo })],
};

/**
 * With Face ID / fingerprint on: the keypad's biometrics key, and the system prompt opens once on
 * arrival (on the phone it is the real prompt; cancel it to type the PIN).
 */
export const Biometrics: Story = {
  decorators: [withPhoneSandbox({ secure: pinSet }), withAppData({ seed: seedBiometricsOn })],
};

/** After 5 wrong PINs: the keypad is disabled with "Try again in 30 s" counting down. */
export const LockedOut: Story = {
  decorators: [withPhoneSandbox({ secure: pinLockedShort }), withAppData({ seed: seedDemo })],
};

/** After 10 wrong PINs: five minutes, shown as minutes and seconds. */
export const LockedOutLong: Story = {
  decorators: [withPhoneSandbox({ secure: pinLockedLong }), withAppData({ seed: seedDemo })],
};

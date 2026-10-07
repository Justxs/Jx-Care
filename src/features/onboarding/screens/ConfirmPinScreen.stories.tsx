import type { Meta, StoryObj } from '@storybook/react-native';

import { STORY_PIN, withPhoneSandbox } from '@/storybook/seeds/settings';

import { setDraftPin } from '../draft';
import { ConfirmPinScreen } from './ConfirmPinScreen';

/** O3 Confirm PIN against the draft PIN from O2 (2580 here): a match moves on, a mismatch shakes. */
const meta = {
  title: 'Screens/Onboarding/Confirm PIN',
  component: ConfirmPinScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ConfirmPinScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** O2 chose 2580. */
export const Default: Story = {
  decorators: [withPhoneSandbox({ draft: () => setDraftPin(STORY_PIN) })],
};

/** Opened without a PIN from O2 (a link or a restart): back to O1. */
export const NoDraftPin: Story = { decorators: [withPhoneSandbox()] };

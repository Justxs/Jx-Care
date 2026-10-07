import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedEmpty } from '@/storybook/fixtures';
import { withPhoneSandbox } from '@/storybook/seeds/settings';

import { markDraftSaved } from '../draft';
import { BiometricsScreen } from './BiometricsScreen';

/**
 * O5 Face ID or fingerprint, after O4 saved. Turn on opens the phone's real biometric prompt (it
 * never reads the PIN); the setting goes to the story database.
 */
const meta = {
  title: 'Screens/Onboarding/Biometrics',
  component: BiometricsScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof BiometricsScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The phone offers Face ID. */
export const Face: Story = {
  decorators: [
    withPhoneSandbox({ draft: () => markDraftSaved('face') }),
    withAppData({ seed: seedEmpty }),
  ],
};

/** The phone offers a fingerprint sensor. */
export const Fingerprint: Story = {
  decorators: [
    withPhoneSandbox({ draft: () => markDraftSaved('fingerprint') }),
    withAppData({ seed: seedEmpty }),
  ],
};

/** Reached before O4 saved (a link): back to O1. */
export const NotSaved: Story = {
  decorators: [withPhoneSandbox(), withAppData({ seed: seedEmpty })],
};

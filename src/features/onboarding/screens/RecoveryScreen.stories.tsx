import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { STORY_PIN, withPhoneSandbox } from '@/storybook/seeds/settings';

import { setDraftPin } from '../draft';
import { RecoveryScreen } from './RecoveryScreen';

/**
 * O4 Recovery question. Continue saves the PIN and answer to the story's in-memory secure storage
 * and the settings row to the story database, then moves on (logged); nothing reaches the phone.
 */
const meta = {
  title: 'Screens/Onboarding/Recovery question',
  component: RecoveryScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RecoveryScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** No question picked yet; a fresh install has no settings row. */
export const Default: Story = {
  decorators: [withPhoneSandbox({ draft: () => setDraftPin(STORY_PIN) }), withAppData()],
};

/** Opened without a confirmed PIN: back to O1. */
export const NoDraftPin: Story = { decorators: [withPhoneSandbox(), withAppData()] };

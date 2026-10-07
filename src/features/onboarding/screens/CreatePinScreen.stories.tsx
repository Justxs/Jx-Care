import type { Meta, StoryObj } from '@storybook/react-native';

import { withPhoneSandbox } from '@/storybook/seeds/settings';

import { rejectDraftPin } from '../draft';
import { CreatePinScreen } from './CreatePinScreen';

/**
 * O2 Create PIN. Four digits move on to O3 (logged); 1234 and four of a kind are refused in place.
 * The draft PIN stays in memory, as in the app.
 */
const meta = {
  title: 'Screens/Onboarding/Create PIN',
  component: CreatePinScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CreatePinScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** No digits yet. */
export const Default: Story = { decorators: [withPhoneSandbox()] };

/** Sent back from O3 because the PINs differed: "PINs don't match" until the next digit. */
export const AfterMismatch: Story = {
  decorators: [withPhoneSandbox({ draft: rejectDraftPin })],
};

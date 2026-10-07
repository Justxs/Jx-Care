import type { Meta, StoryObj } from '@storybook/react-native';

import { withPhoneSandbox } from '@/storybook/seeds/settings';

import { setDraftLanguage } from '../draft';
import { WelcomeScreen } from './WelcomeScreen';

/**
 * O1 Welcome and language. Picking a language switches the app's strings at once, as in the app
 * (the toolbar's EN/LT is set again on the next story).
 */
const meta = {
  title: 'Screens/Onboarding/Welcome',
  component: WelcomeScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof WelcomeScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** First launch: the app's language is picked. */
export const Default: Story = { decorators: [withPhoneSandbox()] };

/** Back from O2 after picking Lithuanian: Lietuvių stays picked. */
export const LithuanianPicked: Story = {
  decorators: [withPhoneSandbox({ draft: () => setDraftLanguage('lt') })],
};

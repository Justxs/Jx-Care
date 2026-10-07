import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo } from '@/storybook/fixtures';
import {
  pinOnly,
  pinSet,
  pinSetLongQuestion,
  recoveryLocked,
  withoutReset,
  withPhoneSandbox,
} from '@/storybook/seeds/settings';

import { ForgotPinScreen, type ForgotPinScreenProps } from './ForgotPinScreen';

/**
 * L2 Forgot PIN. The question and answer live in the story's in-memory secure storage: "Rex" is
 * the right answer and leads to Create a new PIN and Enter it again. Reset app is real up to the
 * last tap, where the story database refuses (`withoutReset`), so the "couldn't reset" message
 * shows instead of the phone's data being deleted.
 */
const meta = {
  title: 'Screens/Lock/Forgot PIN',
  component: ForgotPinScreen,
  args: {
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<ForgotPinScreenProps, 'onClose' | 'onDone'>),
  },
  parameters: { layout: 'fullscreen' },
  argTypes: {
    onClose: { action: 'closed' },
    onDone: { action: 'new PIN saved' },
  },
} satisfies Meta<typeof ForgotPinScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A preset question ("What was your first pet's name?") and an empty answer. */
export const Question: Story = {
  decorators: [withPhoneSandbox({ secure: pinSet }), withAppData({ seed: withoutReset(seedDemo) })],
};

/** A long question of the person's own, in Lithuanian: it wraps above the field. */
export const LongQuestion: Story = {
  decorators: [
    withPhoneSandbox({ secure: pinSetLongQuestion }),
    withAppData({ seed: withoutReset(seedDemo) }),
  ],
};

/** After 5 wrong answers: the field is locked for 15 minutes with a countdown. */
export const LockedOut: Story = {
  decorators: [
    withPhoneSandbox({ secure: recoveryLocked }),
    withAppData({ seed: withoutReset(seedDemo) }),
  ],
};

/** No recovery question saved: only Reset app is offered. */
export const NoQuestion: Story = {
  decorators: [
    withPhoneSandbox({ secure: pinOnly }),
    withAppData({ seed: withoutReset(seedDemo) }),
  ],
};

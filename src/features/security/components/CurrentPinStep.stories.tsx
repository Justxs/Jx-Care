import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { pinLockedShort, pinSet, withPhoneSandbox } from '@/storybook/seeds/settings';

import { CurrentPinStep, type CurrentPinStepProps } from './CurrentPinStep';

/**
 * The current PIN before a security change (S6). It checks against the story's in-memory secure
 * storage: 2580 is right, other PINs shake and count toward the lockout there.
 */
const meta = {
  title: 'Components/Security/CurrentPinStep',
  component: CurrentPinStep,
  parameters: { layout: 'fullscreen' },
  args: {
    title: '',
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<CurrentPinStepProps, 'onVerified'>),
  },
  argTypes: { onVerified: { action: 'verified' } },
  render: function CurrentPin(args: CurrentPinStepProps) {
    const { t } = useTranslation();
    return <CurrentPinStep {...args} title={t('security.changePin.oldTitle')} />;
  },
} satisfies Meta<typeof CurrentPinStep>;

export default meta;

type Story = StoryObj<typeof meta>;

/** "Enter your current PIN" (Change PIN). */
export const Default: Story = { decorators: [withPhoneSandbox({ secure: pinSet })] };

/** With a line under the title (Recovery question). */
export const WithBody: Story = {
  decorators: [withPhoneSandbox({ secure: pinSet })],
  render: function WithBody(args: CurrentPinStepProps) {
    const { t } = useTranslation();
    return (
      <CurrentPinStep
        {...args}
        title={t('security.recovery.pinTitle')}
        body={t('security.recovery.pinBody')}
      />
    );
  },
};

/** The lock screen's lockout is running: the keypad is disabled with a countdown. */
export const LockedOut: Story = { decorators: [withPhoneSandbox({ secure: pinLockedShort })] };

import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { PinStep, type PinStepProps } from './PinStep';

/** O2 texts, translated. */
function CreatePin(args: PinStepProps) {
  const { t } = useTranslation();
  return (
    <PinStep
      {...args}
      title={t('onboarding.createPinTitle')}
      body={t('onboarding.createPinBody')}
    />
  );
}

/** O2 and O3: the title on top and the PinPad pinned to the bottom. */
const meta = {
  title: 'Components/Onboarding/PinStep',
  component: PinStep,
  parameters: { layout: 'fullscreen' },
  args: {
    step: 1,
    title: '',
    filled: 0,
    disabled: false,
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<PinStepProps, 'onDigit' | 'onDelete'>),
  },
  argTypes: {
    step: { control: { type: 'number', min: 0, max: 4, step: 1 } },
    filled: { control: { type: 'number', min: 0, max: 4, step: 1 } },
    message: { control: 'text' },
    disabled: { control: 'boolean' },
    onDigit: { action: 'digit' },
    onDelete: { action: 'delete' },
  },
  render: CreatePin,
} satisfies Meta<typeof PinStep>;

export default meta;

type Story = StoryObj<typeof meta>;

/** O2 with no digits yet. */
export const Empty: Story = {};

/** Three digits typed. */
export const Typing: Story = { args: { filled: 3 } };

/** O3 after a mismatch: the message, and the keypad waits before going back. */
export const Mismatch: Story = {
  args: { step: 2, filled: 4, disabled: true },
  render: function Mismatch(args: PinStepProps) {
    const { t } = useTranslation();
    return (
      <PinStep
        {...args}
        title={t('onboarding.confirmPinTitle')}
        message={t('onboarding.pinMismatch')}
      />
    );
  },
};

import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { NewPinStep, type NewPinStepProps } from './NewPinStep';

/** The O2/O3 layout inside Forgot PIN and Change PIN; translated title and body. */
function CreatePin(args: NewPinStepProps) {
  const { t } = useTranslation();
  return (
    <NewPinStep {...args} title={t('lock.newPin.createTitle')} body={t('lock.newPin.createBody')} />
  );
}

const meta = {
  title: 'Components/Security/NewPinStep',
  component: NewPinStep,
  parameters: { layout: 'fullscreen' },
  args: {
    title: '',
    filled: 0,
    disabled: false,
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<NewPinStepProps, 'onDigit' | 'onDelete'>),
  },
  argTypes: {
    filled: { control: { type: 'number', min: 0, max: 4, step: 1 } },
    message: { control: 'text' },
    disabled: { control: 'boolean' },
    onDigit: { action: 'digit' },
    onDelete: { action: 'delete' },
  },
  render: CreatePin,
} satisfies Meta<typeof NewPinStep>;

export default meta;

type Story = StoryObj<typeof meta>;

/** "Create a new PIN", no digits yet. */
export const Empty: Story = {};

/** Two digits typed. */
export const Typing: Story = { args: { filled: 2 } };

/** A PIN the rules refuse, with its message in the reserved line. */
export const TooEasy: Story = {
  render: function TooEasy(args: NewPinStepProps) {
    const { t } = useTranslation();
    return (
      <NewPinStep
        {...args}
        title={t('lock.newPin.createTitle')}
        body={t('lock.newPin.createBody')}
        message={t('security.errors.pinTooEasy', { pin: '1111' })}
      />
    );
  },
};

/** "Enter it again" after a mismatch: the message, with the keypad waiting. */
export const Mismatch: Story = {
  args: { filled: 4, disabled: true },
  render: function Mismatch(args: NewPinStepProps) {
    const { t } = useTranslation();
    return (
      <NewPinStep
        {...args}
        title={t('lock.newPin.confirmTitle')}
        message={t('lock.newPin.mismatch')}
      />
    );
  },
};

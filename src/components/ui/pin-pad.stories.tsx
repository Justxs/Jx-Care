import type { Meta, StoryObj } from '@storybook/react-native';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PIN_LENGTH, PinPad, type PinPadHandle } from './pin-pad';

const meta = {
  title: 'UI/PinPad',
  component: PinPad,
  args: { filled: 0, biometric: false, disabled: false },
  argTypes: {
    filled: { control: { type: 'number', min: 0, max: PIN_LENGTH, step: 1 } },
    biometric: { control: 'boolean' },
    disabled: { control: 'boolean' },
    message: { control: 'text' },
    onDigit: { action: 'digit' },
    onDelete: { action: 'deleted' },
    onBiometric: { action: 'biometric' },
  },
} satisfies Meta<typeof PinPad>;

export default meta;

// Typed from Meta, not `typeof meta`: the required callbacks come from the action argTypes,
// so stories needn't pass them.
type Story = StoryObj<Meta<typeof PinPad>>;

/** Nothing typed: empty dots, Delete off. */
export const Empty: Story = {};

/** Two digits typed; the digits themselves are never shown. */
export const TwoDigits: Story = { args: { filled: 2 } };

/** Face ID / fingerprint key bottom left. */
export const WithBiometrics: Story = { args: { filled: 1, biometric: true } };

/** A wrong PIN: the reserved line under the dots says so, the keypad doesn't move. */
export const WrongPin: Story = {
  render: function WrongPin(args) {
    const { t } = useTranslation();
    return <PinPad {...args} message={t('lock.wrongPin')} />;
  },
};

/** Locked out after too many tries: every key off, the wait counts down. */
export const LockedOut: Story = {
  args: { disabled: true, biometric: true },
  render: function LockedOut(args) {
    const { t } = useTranslation();
    return <PinPad {...args} message={t('lock.tryAgainSeconds', { seconds: 30 })} />;
  },
};

/** Type a PIN: 2468 unlocks, anything else shakes (fades with Reduce Motion) and clears. */
export const Interactive: Story = {
  args: { biometric: true },
  render: function Interactive(args) {
    const { t } = useTranslation();
    const pad = useRef<PinPadHandle>(null);
    const [pin, setPin] = useState('');
    const [message, setMessage] = useState<string>();
    const onDigit = (digit: string) => {
      args.onDigit?.(digit);
      const next = pin + digit;
      if (next.length < PIN_LENGTH) {
        setPin(next);
        setMessage(undefined);
        return;
      }
      setPin('');
      if (next === '2468') setMessage(t('common.done'));
      else {
        pad.current?.shake();
        setMessage(t('lock.wrongPin'));
      }
    };
    return (
      <PinPad
        {...args}
        ref={pad}
        filled={pin.length}
        message={message}
        onDigit={onDigit}
        onDelete={() => {
          args.onDelete?.();
          setPin((p) => p.slice(0, -1));
        }}
      />
    );
  },
};

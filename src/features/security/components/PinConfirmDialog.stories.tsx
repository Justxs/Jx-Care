import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { pinLockedShort, pinSet, withPhoneSandbox } from '@/storybook/seeds/settings';

import { PinConfirmDialog, type PinConfirmDialogProps } from './PinConfirmDialog';

/** With the Reset app texts; switch EN/LT in the toolbar. */
function ResetPinDialog(args: PinConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <PinConfirmDialog
      {...args}
      title={t('lock.reset.pinTitle')}
      description={t('lock.reset.pinBody')}
    />
  );
}

/**
 * Asks for the PIN before Reset app from Settings. It checks against the story's in-memory secure
 * storage: 2580 confirms, other PINs count toward the lockout there.
 */
const meta = {
  title: 'Components/Security/PinConfirmDialog',
  component: PinConfirmDialog,
  args: {
    open: true,
    title: '',
    description: '',
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<PinConfirmDialogProps, 'onOpenChange' | 'onConfirmed'>),
  },
  argTypes: {
    open: { control: 'boolean' },
    onOpenChange: { action: 'open changed' },
    onConfirmed: { action: 'confirmed' },
  },
  render: ResetPinDialog,
} satisfies Meta<typeof PinConfirmDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** An empty PIN field with the number keyboard. */
export const Open: Story = { decorators: [withPhoneSandbox({ secure: pinSet })] };

/** The lock screen's lockout is running: the field is disabled with a countdown. */
export const LockedOut: Story = { decorators: [withPhoneSandbox({ secure: pinLockedShort })] };

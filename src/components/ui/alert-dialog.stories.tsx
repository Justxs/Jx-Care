import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AlertDialog, type AlertDialogProps } from './alert-dialog';
import { Button } from './button';

/** Opens the dialog at start; Cancel or the action closes it and the button opens it again. */
function OpenDialog(props: AlertDialogProps) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button variant="secondary" onPress={() => setOpen(true)}>
        Open dialog
      </Button>
      <AlertDialog
        {...props}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          props.onOpenChange(next);
        }}
        onAction={() => {
          setOpen(false);
          props.onAction();
        }}
      />
    </>
  );
}

const meta = {
  title: 'UI/AlertDialog',
  component: AlertDialog,
  args: {
    open: true,
    title: 'Delete Vitamin C serum?',
    description: "Its notes and dates are deleted for good. This can't be undone.",
    actionLabel: 'Delete',
    cancelLabel: 'Cancel',
    destructive: true,
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<AlertDialogProps, 'onAction' | 'onOpenChange'>),
  },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    actionLabel: { control: 'text' },
    cancelLabel: { control: 'text' },
    destructive: { control: 'boolean' },
    confirmText: { control: 'text' },
    confirmLabel: { control: 'text' },
    onAction: { action: 'action' },
    onCancel: { action: 'cancelled' },
    onOpenChange: { action: 'open changed' },
  },
  render: (args) => <OpenDialog {...args} />,
} satisfies Meta<typeof AlertDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A destructive confirm: the verb in red, Cancel as a ghost button. */
export const Destructive: Story = {};

/** A non-destructive confirm uses the primary button. */
export const Neutral: Story = {
  args: {
    destructive: false,
    title: 'Mark Retinol serum finished?',
    description: 'It moves to Finished and onto the shopping list as Buy again.',
    actionLabel: 'Mark finished',
  },
};

/** Reset app: the action stays off until RESET is typed, with Export backup above it. */
export const TypeToConfirm: Story = {
  render: function TypeToConfirm(args) {
    const { t } = useTranslation();
    return (
      <OpenDialog
        {...args}
        title={t('lock.reset.title')}
        description={`${t('lock.reset.notInGallery')} ${t('lock.reset.noUndo')}`}
        actionLabel={t('lock.reset.action')}
        cancelLabel={t('common.cancel')}
        confirmText="RESET"
        confirmLabel={t('lock.reset.confirmLabel')}
        secondaryAction={{ label: t('lock.reset.exportBackup'), onPress: () => {} }}
      />
    );
  },
};

/** Translated product delete; switch EN/LT in the toolbar. */
export const Translated: Story = {
  render: function Translated(args) {
    const { t } = useTranslation();
    return (
      <OpenDialog
        {...args}
        title={t('products.archive.deleteTitle', { name: 'Vitamin C serum' })}
        description={t('products.archive.deleteBody')}
        actionLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
      />
    );
  },
};

/** Lithuanian runs longer: the title and buttons wrap. */
export const LongLithuanian: Story = {
  args: {
    title: 'Ištrinti „Hialurono rūgšties drėkinamasis serumas su niacinamidu“?',
    description:
      'Jo pastabos ir datos ištrinamos visam laikui. Šio veiksmo atšaukti negalima, todėl prieš tai pasidarykite atsarginę kopiją.',
    actionLabel: 'Ištrinti visam laikui',
    cancelLabel: 'Atšaukti',
  },
};

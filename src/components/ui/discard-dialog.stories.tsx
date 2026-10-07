import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';

import { Button } from './button';
import { DiscardDialog, type DiscardDialogProps } from './discard-dialog';

/** Open at start; either button closes it and the button opens it again. */
function OpenDialog(props: DiscardDialogProps) {
  const [open, setOpen] = useState(props.open);
  return (
    <>
      <Button variant="secondary" onPress={() => setOpen(true)}>
        Close a form with unsaved edits
      </Button>
      <DiscardDialog
        open={open}
        onDiscard={() => {
          setOpen(false);
          props.onDiscard();
        }}
        onKeepEditing={() => {
          setOpen(false);
          props.onKeepEditing();
        }}
      />
    </>
  );
}

const meta = {
  title: 'UI/DiscardDialog',
  component: DiscardDialog,
  args: {
    open: true,
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<DiscardDialogProps, 'onDiscard' | 'onKeepEditing'>),
  },
  argTypes: {
    open: { control: 'boolean' },
    onDiscard: { action: 'discarded' },
    onKeepEditing: { action: 'kept editing' },
  },
  render: (args) => <OpenDialog key={String(args.open)} {...args} />,
} satisfies Meta<typeof DiscardDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** "Discard changes?" with Discard (danger) and Keep editing; text follows EN/LT. */
export const Open: Story = {};

/** Closed until the button asks. */
export const Closed: Story = { args: { open: false } };

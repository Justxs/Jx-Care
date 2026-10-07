import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';
import { pinSet, seedRecentBackup, withPhoneSandbox } from '@/storybook/seeds/settings';

import { ResetDialog, type ResetDialogProps } from './ResetDialog';

/** Stands in for the real reset (which deletes the phone's photos and starts onboarding). */
const fakeReset = () => Promise.resolve();

/**
 * Reset app and delete all data (L2, S8): real counts from the story database, then typing RESET.
 * `reset` is replaced, so confirming only closes the dialog.
 */
const meta = {
  title: 'Components/Security/ResetDialog',
  component: ResetDialog,
  args: {
    open: true,
    fromSettings: false,
    reset: fakeReset,
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<ResetDialogProps, 'onOpenChange'>),
  },
  argTypes: {
    open: { control: 'boolean' },
    fromSettings: { control: 'boolean' },
    onOpenChange: { action: 'open changed' },
    onExport: { action: 'export backup' },
    onFailed: { action: 'failed' },
  },
} satisfies Meta<typeof ResetDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** From Forgot PIN, with demo data and no backup: "This can't be undone". */
export const FromLockScreen: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** With a backup two days ago: says the data can come back from it. */
export const WithBackup: Story = { decorators: [withAppData({ seed: seedRecentBackup })] };

/** Nothing saved yet: zero counts. */
export const NoData: Story = { decorators: [withAppData({ seed: seedEmpty })] };

/**
 * From Settings: the PIN first (2580, in the story's in-memory secure storage), then the counts
 * with Export backup above Reset app.
 */
export const FromSettings: Story = {
  args: { fromSettings: true },
  decorators: [withPhoneSandbox({ secure: pinSet }), withAppData({ seed: seedDemo })],
};

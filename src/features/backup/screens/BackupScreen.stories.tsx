import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';
import { seedOldBackup, seedRecentBackup, withPhoneSandbox } from '@/storybook/seeds/settings';

import { BackupScreen } from './BackupScreen';

/**
 * S8 Backup and restore, on an in-memory file system (`withPhoneSandbox`): Export writes the file
 * there and logs the share sheet; Import picks a backup of the story's own data from three days
 * ago, and Replace all data restores it into the story database. Reset app asks for a PIN the
 * story doesn't have, so the real reset (which deletes the phone's photos) can't run here; see
 * Components/Security/ResetDialog for the rest of that flow.
 */
const meta = {
  title: 'Screens/Settings/Backup',
  component: BackupScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof BackupScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Never backed up: the amber callout, and no photos for a zip. */
export const NoBackup: Story = {
  decorators: [withPhoneSandbox({ backup: {} }), withAppData({ seed: seedEmpty })],
};

/** A backup two days ago, and four product photos for the zip option and the storage line. */
export const Recent: Story = {
  decorators: [
    withPhoneSandbox({ backup: { photos: 4 } }),
    withAppData({ seed: seedRecentBackup }),
  ],
};

/** The last backup was 45 days ago: the amber callout with its date. */
export const Overdue: Story = {
  decorators: [withPhoneSandbox({ backup: {} }), withAppData({ seed: seedOldBackup })],
};

/** Import picks a JSON file that isn't a backup: the error shows in the reserved line. */
export const NotABackup: Story = {
  decorators: [
    withPhoneSandbox({ backup: { pick: 'notBackup' } }),
    withAppData({ seed: seedDemo }),
  ],
};

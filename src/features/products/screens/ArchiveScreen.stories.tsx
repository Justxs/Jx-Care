import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';
import { seedArchive } from '@/storybook/seeds/products';

import { ArchiveScreen } from './ArchiveScreen';

const meta = {
  title: 'Screens/Products/Archive',
  component: ArchiveScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ArchiveScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** P5 with the demo's finished clay mask and its cost per day. "…" offers Restore, Buy again, Delete. */
export const OneFinished: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** Several finished products, a long Lithuanian name among them; sort by date or by cost per day. */
export const Several: Story = { decorators: [withAppData({ seed: seedArchive })] };

/** Nothing finished yet: the empty state. */
export const Empty: Story = { decorators: [withAppData({ seed: seedEmpty })] };

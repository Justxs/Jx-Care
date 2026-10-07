import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { demoIds, seedDemo } from '@/storybook/fixtures';
import { productStoryIds, seedProductExtras } from '@/storybook/seeds/products';

import { NotesTimeline } from './NotesTimeline';

const demo = withAppData({ seed: seedDemo });

const meta = {
  title: 'Components/Products/NotesTimeline',
  component: NotesTimeline,
  args: { productId: demoIds.products.retinol },
} satisfies Meta<typeof NotesTimeline>;

export default meta;

type Story = StoryObj<typeof meta>;

/** P2 notes: the retinol's two notes, newest first. Tap to edit, long press for Edit and Delete. */
export const WithNotes: Story = { decorators: [demo] };

/** No notes yet: the empty line and Add note. */
export const Empty: Story = { args: { productId: demoIds.products.cleanser }, decorators: [demo] };

/** A long Lithuanian note wraps. */
export const LongNote: Story = {
  args: { productId: productStoryIds.products.longName },
  decorators: [withAppData({ seed: seedProductExtras })],
};

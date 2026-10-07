import type { Meta, StoryObj } from '@storybook/react-native';

import { addDays } from '@/lib/appDay';
import { withAppData } from '@/storybook/appData';
import { FIXTURE_TODAY, seedDemo } from '@/storybook/fixtures';
import { seedProductExtras } from '@/storybook/seeds/products';

import { DayNotesSection } from './DayNotesSection';

const demo = withAppData({ seed: seedDemo });

const meta = {
  title: 'Components/Products/DayNotesSection',
  component: DayNotesSection,
  // seedDemo writes a retinol note two days before today.
  args: { day: addDays(FIXTURE_TODAY, -2) },
} satisfies Meta<typeof DayNotesSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/** C2 Product notes on a day with one note: product name, tags and text, linking to the product. */
export const OneNote: Story = { decorators: [demo] };

/** A day without notes: the section is not drawn at all. */
export const NoNotes: Story = { args: { day: FIXTURE_TODAY }, decorators: [demo] };

/** A long Lithuanian product name and note wrap. */
export const LongText: Story = {
  args: { day: addDays(FIXTURE_TODAY, -1) },
  decorators: [withAppData({ seed: seedProductExtras })],
};

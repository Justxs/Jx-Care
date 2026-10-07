import type { Meta, StoryObj } from '@storybook/react-native';

import { addDays } from '@/lib/appDay';
import { withAppData } from '@/storybook/appData';
import { FIXTURE_TODAY, seedDemo, seedEmpty } from '@/storybook/fixtures';
import { seedHairLateWash, seedHairOverdue } from '@/storybook/seeds/hair';
import { withPendingData } from '@/storybook/seeds/pending';

import { HairDaySection } from './HairDaySection';

const meta = {
  title: 'Components/Hair/HairDaySection',
  component: HairDaySection,
  args: { day: addDays(FIXTURE_TODAY, -3) },
} satisfies Meta<typeof HairDaySection>;

export default meta;

type Story = StoryObj<typeof meta>;

const demo = withAppData({ seed: seedDemo });

/** C2 three days ago: the wash with its shampoo and the note "Scalp a bit itchy", deletable. */
export const WashDone: Story = { decorators: [demo] };

/** Yesterday: no hair care logged. */
export const NothingDone: Story = { decorators: [demo], args: { day: addDays(FIXTURE_TODAY, -1) } };

/** Today, with the wash due and not done yet. */
export const DueToday: Story = { decorators: [demo], args: { day: FIXTURE_TODAY } };

/** A wash done two days late: the due date in `warning` under it. */
export const LateWash: Story = {
  args: { day: FIXTURE_TODAY },
  decorators: [withAppData({ seed: seedHairLateWash })],
};

/** A wash eight days ago: older than 7 days, so it shows without the delete button. */
export const ReadOnly: Story = {
  args: { day: addDays(FIXTURE_TODAY, -8) },
  decorators: [withAppData({ seed: seedHairOverdue })],
};

/** No hair task at all: the section is hidden, so the canvas stays empty. */
export const NoHairTask: Story = { decorators: [withAppData({ seed: seedEmpty })] };

/** While the day loads. */
export const Loading: Story = { decorators: [withPendingData(), demo] };

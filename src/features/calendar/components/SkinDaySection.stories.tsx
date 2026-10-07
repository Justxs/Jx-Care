import type { Meta, StoryObj } from '@storybook/react-native';

import { addDays } from '@/lib/appDay';
import { withAppData } from '@/storybook/appData';
import { FIXTURE_TODAY, seedDemo, seedEmpty } from '@/storybook/fixtures';
import { seedDemoEarlier } from '@/storybook/seeds/calendar';
import { withPendingData } from '@/storybook/seeds/pending';

import { SkinDaySection } from './SkinDaySection';

const meta = {
  title: 'Components/Calendar/SkinDaySection',
  component: SkinDaySection,
  args: { day: FIXTURE_TODAY },
} satisfies Meta<typeof SkinDaySection>;

export default meta;

type Story = StoryObj<typeof meta>;

const demo = withAppData({ seed: seedDemo });

/** C2 today: Morning partly done (2 of 4 ticked) and the A/B evening, every step tickable. */
export const Today: Story = { decorators: [demo] };

/** Yesterday: both routines done; still changeable (within the last 7 days). */
export const Yesterday: Story = { args: { day: addDays(FIXTURE_TODAY, -1) }, decorators: [demo] };

/** Seven days ago, past the edit window: the ticks as they were, not changeable. */
export const ReadOnly: Story = {
  args: { day: addDays(FIXTURE_TODAY, -7) },
  decorators: [withAppData({ seed: seedDemoEarlier(2) })],
};

/** A day still to come: what is planned, nothing to tick yet. */
export const FutureDay: Story = { args: { day: addDays(FIXTURE_TODAY, 3) }, decorators: [demo] };

/** No routines: "No skin routines were due this day." */
export const NothingDue: Story = { decorators: [withAppData({ seed: seedEmpty })] };

/** While the day loads. */
export const Loading: Story = { decorators: [withPendingData(), demo] };

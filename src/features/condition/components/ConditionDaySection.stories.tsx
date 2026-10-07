import type { Meta, StoryObj } from '@storybook/react-native';

import { addDays } from '@/lib/appDay';
import { withAppData } from '@/storybook/appData';
import { FIXTURE_TODAY, seedDemo } from '@/storybook/fixtures';
import { withPendingData } from '@/storybook/seeds/pending';

import { ConditionDaySection } from './ConditionDaySection';

const meta = {
  title: 'Components/Condition/ConditionDaySection',
  component: ConditionDaySection,
  args: { day: addDays(FIXTURE_TODAY, -2) },
} satisfies Meta<typeof ConditionDaySection>;

export default meta;

type Story = StoryObj<typeof meta>;

const demo = withAppData({ seed: seedDemo });

/** C2 two days ago: skin Breakout and Redness with a note, hair Oily roots, and Edit. */
export const SkinAndHair: Story = { decorators: [demo] };

/** Four days ago: only skin was logged (Dry). */
export const SkinOnly: Story = { args: { day: addDays(FIXTURE_TODAY, -4) }, decorators: [demo] };

/** Nothing logged: "Log how your skin was" opens T4 on that day. */
export const NotLogged: Story = { args: { day: addDays(FIXTURE_TODAY, -3) }, decorators: [demo] };

/** A day still to come: the section is hidden, so the canvas stays empty. */
export const Future: Story = { args: { day: addDays(FIXTURE_TODAY, 1) }, decorators: [demo] };

/** While the day loads. */
export const Loading: Story = { decorators: [withPendingData(), demo] };

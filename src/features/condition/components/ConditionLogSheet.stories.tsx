import type { Meta, StoryObj } from '@storybook/react-native';

import { addDays } from '@/lib/appDay';
import { withAppData } from '@/storybook/appData';
import { FIXTURE_TODAY, seedDemo } from '@/storybook/fixtures';

import { ConditionLogSheet, type ConditionLogSheetProps } from './ConditionLogSheet';

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<ConditionLogSheetProps, 'onClose'>;

const meta = {
  title: 'Components/Condition/ConditionLogSheet',
  component: ConditionLogSheet,
  parameters: { layout: 'fullscreen' },
  args: { ...actions, open: true, day: FIXTURE_TODAY, area: 'skin' },
  argTypes: {
    open: { control: 'boolean' },
    day: { control: 'text' },
    area: { control: 'radio', options: ['skin', 'hair'] },
    onClose: { action: 'closed' },
  },
} satisfies Meta<typeof ConditionLogSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

const demo = withAppData({ seed: seedDemo });

/** T4 for today, nothing logged yet: the skin chips, a note with its 0/280 count, Save. */
export const Today: Story = { decorators: [demo] };

/** A logged day: its tags picked (counts on the Skin / Hair switch) and its note filled in. */
export const LoggedDay: Story = { args: { day: addDays(FIXTURE_TODAY, -2) }, decorators: [demo] };

/** Opened on Hair (Today's "Hair and note"). */
export const HairSide: Story = {
  args: { day: addDays(FIXTURE_TODAY, -2), area: 'hair' },
  decorators: [demo],
};

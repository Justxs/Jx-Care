import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';
import { seedLongNotes } from '@/storybook/seeds/settings';

import { ConflictsScreen } from './ConflictsScreen';

/** S3 Conflicts: the rules, how many routines each fires in, and the rule editor. */
const meta = {
  title: 'Screens/Settings/Conflicts',
  component: ConflictsScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ConflictsScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The default rules plus the person's own Ascorbic acid × Glycolic acid (in two routines). */
export const Demo: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** No rules: Add common rules or Add a rule. */
export const Empty: Story = { decorators: [withAppData({ seed: seedEmpty })] };

/** One more rule with a long Lithuanian note, to see it wrap. */
export const LongNote: Story = { decorators: [withAppData({ seed: seedLongNotes })] };

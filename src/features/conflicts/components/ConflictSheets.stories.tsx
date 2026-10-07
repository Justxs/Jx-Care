import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo } from '@/storybook/fixtures';

import type { ConflictTarget } from '../warnings';
import { ConflictTagButton } from './ConflictSheets';

// Product and routine names are data, so they stay in English in both languages.
const fullConflict: ConflictTarget = {
  ruleId: 1,
  stepId: 2,
  mild: false,
  conflict: {
    first: { product: 'Vitamin C 15% Serum', routine: 'Morning' },
    second: { product: 'Glycolic Acid 7% Toner', routine: 'Exfoliating night' },
    weekdays: [1, 3, 5],
    note: 'Stings on the same day',
    mild: false,
  },
  mildStep: null,
};

const mildConflict: ConflictTarget = {
  ruleId: 2,
  stepId: 6,
  mild: true,
  conflict: {
    first: { product: 'Retinol 0.5% in Squalane', routine: 'Retinol night' },
    second: { product: 'Glycolic Acid 7% Toner', routine: 'Exfoliating night' },
    weekdays: [2],
    note: null,
    mild: true,
  },
  mildStep: { product: 'Glycolic Acid 7% Toner', everyNDays: 3 },
};

/**
 * The tappable conflict tag on routine cards and Today: it opens "Why this warning" (with Edit the
 * routine and See the rule, both logged), or the Mild conflict sheet when every conflict is mild.
 */
const meta = {
  title: 'Components/Conflicts/ConflictTagButton',
  component: ConflictTagButton,
  args: { targets: [fullConflict], routineId: 1 },
  // The sheets format weekdays in the app's language, from the settings.
  decorators: [withAppData({ seed: seedDemo })],
} satisfies Meta<typeof ConflictTagButton>;

export default meta;

type Story = StoryObj<typeof meta>;

/** "Conflict": vitamin C in the morning against glycolic acid in the evening, three days a week. */
export const Conflict: Story = {};

/** "Mild conflict": the toner runs every 3 days, so they only sometimes meet. */
export const Mild: Story = { args: { targets: [mildConflict] } };

/** A full and a mild one: the full conflict wins. */
export const Mixed: Story = { args: { targets: [mildConflict, fullConflict] } };

/** No conflicts: renders nothing. */
export const None: Story = { args: { targets: [] } };

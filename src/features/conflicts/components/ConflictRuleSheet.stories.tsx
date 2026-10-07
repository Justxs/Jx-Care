import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';
import { seedLongNotes } from '@/storybook/seeds/settings';

import { useRules } from '../api';
import { ConflictRuleSheet, type ConflictRuleSheetProps } from './ConflictRuleSheet';

/** Opens on the story database's first or last rule, once the rules are read. */
function EditRule({ which, ...args }: ConflictRuleSheetProps & { which: 'first' | 'last' }) {
  const rules = useRules().data ?? [];
  const rule = which === 'first' ? rules[0] : rules.at(-1);
  return rule ? <ConflictRuleSheet {...args} rule={rule} /> : null;
}

/**
 * S3 rule editor: two side pickers over the story's ingredients and groups, and a note. Saving
 * writes to the story database and shows how many routines the rule affects.
 */
const meta = {
  title: 'Components/Conflicts/ConflictRuleSheet',
  component: ConflictRuleSheet,
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    rule: null,
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<ConflictRuleSheetProps, 'onClose'>),
  },
  argTypes: { onClose: { action: 'closed' } },
} satisfies Meta<typeof ConflictRuleSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A new rule over the demo ingredients and groups. */
export const New: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** A new rule with nothing to pick from yet. */
export const NothingToPick: Story = { decorators: [withAppData({ seed: seedEmpty })] };

/** Editing "Retinoids × AHA/BHA", with Delete rule. */
export const Edit: Story = {
  decorators: [withAppData({ seed: seedDemo })],
  render: (args) => <EditRule {...args} which="first" />,
};

/** Editing a rule with a long Lithuanian note. */
export const LongNote: Story = {
  decorators: [withAppData({ seed: seedLongNotes })],
  render: (args) => <EditRule {...args} which="last" />,
};

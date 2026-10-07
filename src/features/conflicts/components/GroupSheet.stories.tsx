import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo } from '@/storybook/fixtures';

import { useGroups, useIngredients } from '../api';
import { GroupSheet, type GroupSheetProps } from './GroupSheet';

/** The sheet over the story database's ingredients, on the group named `name` (or a new one). */
function StoryGroupSheet({ name, ...args }: GroupSheetProps & { name: string | null }) {
  const ingredients = useIngredients().data;
  const groups = useGroups().data;
  if (!ingredients || !groups) return null;
  const group = name === null ? null : (groups.find((g) => g.name === name) ?? null);
  return <GroupSheet {...args} group={group} ingredients={ingredients} />;
}

/** S2 group editor: name, members (add by search, remove with ×) and Delete group. */
const meta = {
  title: 'Components/Conflicts/GroupSheet',
  component: GroupSheet,
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    group: null,
    ingredients: [],
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<GroupSheetProps, 'onClose'>),
  },
  argTypes: { onClose: { action: 'closed' } },
  decorators: [withAppData({ seed: seedDemo })],
} satisfies Meta<typeof GroupSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A new group: no name, no members. */
export const New: Story = { render: (args) => <StoryGroupSheet {...args} name={null} /> };

/** "Retinoids" from Add common rules: six members and two rules that use it. */
export const Edit: Story = { render: (args) => <StoryGroupSheet {...args} name="Retinoids" /> };

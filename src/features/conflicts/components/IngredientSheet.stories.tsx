import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo } from '@/storybook/fixtures';

import { useGroups, useIngredients } from '../api';
import type { IngredientListItem } from '../repo';
import { IngredientSheet, type IngredientSheetProps } from './IngredientSheet';

/** The sheet on the story database's ingredient named `name`, once the lists are read. */
function StoryIngredientSheet({ name, ...args }: IngredientSheetProps & { name: string }) {
  const ingredient = useIngredients().data?.find((i) => i.name === name);
  const groups = useGroups().data;
  if (!ingredient || !groups) return null;
  return <IngredientSheet {...args} ingredient={ingredient} groups={groups} />;
}

const placeholder: IngredientListItem = {
  id: 0,
  name: '',
  normalizedName: '',
  groupId: null,
  groupName: null,
  productCount: 0,
  ruleCount: 0,
  avoidCount: 0,
};

/**
 * S2 ingredient sheet: rename (into an existing name merges), the group, the products that list
 * it (each opens P2, logged) and Delete when nothing uses it.
 */
const meta = {
  title: 'Components/Conflicts/IngredientSheet',
  component: IngredientSheet,
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    ingredient: placeholder,
    groups: [],
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<IngredientSheetProps, 'onClose'>),
  },
  argTypes: { onClose: { action: 'closed' } },
  decorators: [withAppData({ seed: seedDemo })],
} satisfies Meta<typeof IngredientSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/** "Retinol": in Retinoids and in a product, so it can't be deleted; the catalogue says what it does. */
export const InUse: Story = {
  render: (args) => <StoryIngredientSheet {...args} name="Retinol" />,
};

/** "Tretinoin": only in its group, in no product, so Delete is offered. */
export const Unused: Story = {
  render: (args) => <StoryIngredientSheet {...args} name="Tretinoin" />,
};

/** "Parfum": no group, in two products and on the avoid list. */
export const Avoided: Story = {
  render: (args) => <StoryIngredientSheet {...args} name="Parfum" />,
};

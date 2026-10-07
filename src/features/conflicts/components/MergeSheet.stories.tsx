import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedLongNotes } from '@/storybook/seeds/settings';

import { useIngredients } from '../api';
import { MergeSheet, type MergeSheetProps } from './MergeSheet';

/** The sheet on the story database's ingredients named in `names`, once the list is read. */
function StoryMergeSheet({ names, ...args }: MergeSheetProps & { names: readonly string[] }) {
  const items = (useIngredients().data ?? []).filter((i) => names.includes(i.name));
  return items.length >= 2 ? <MergeSheet {...args} items={items} /> : null;
}

/** S2 merge: which name to keep for duplicates; the one in the most products is picked. */
const meta = {
  title: 'Components/Conflicts/MergeSheet',
  component: MergeSheet,
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    items: [],
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<MergeSheetProps, 'onClose' | 'onMerged'>),
  },
  argTypes: { onClose: { action: 'closed' }, onMerged: { action: 'merged' } },
  decorators: [withAppData({ seed: seedLongNotes })],
} satisfies Meta<typeof MergeSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/** "Ascorbic acid" and "L-Ascorbic acid", one product each. */
export const TwoNames: Story = {
  render: (args) => <StoryMergeSheet {...args} names={['Ascorbic acid', 'L-Ascorbic acid']} />,
};

/** Three names, one in no product. */
export const ThreeNames: Story = {
  render: (args) => (
    <StoryMergeSheet
      {...args}
      names={['Ascorbic acid', 'L-Ascorbic acid', 'Ethyl ascorbic acid']}
    />
  ),
};

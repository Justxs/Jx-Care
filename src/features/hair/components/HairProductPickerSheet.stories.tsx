import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { demoIds, seedDemo, seedEmpty } from '@/storybook/fixtures';

import { HairProductPickerSheet, type HairProductPickerSheetProps } from './HairProductPickerSheet';

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<HairProductPickerSheetProps, 'onClose' | 'onPick'>;

const meta = {
  title: 'Components/Hair/HairProductPickerSheet',
  component: HairProductPickerSheet,
  parameters: { layout: 'fullscreen' },
  args: { ...actions, open: true, selected: [demoIds.products.shampoo] },
  argTypes: {
    open: { control: 'boolean' },
    onClose: { action: 'closed' },
    onPick: { action: 'picked' },
  },
} satisfies Meta<typeof HairProductPickerSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

const demo = withAppData({ seed: seedDemo });

/** Hair products for a wash, the shampoo already picked (several can be picked). */
export const Open: Story = { decorators: [demo] };

/** Nothing picked yet. */
export const NothingPicked: Story = { decorators: [demo], args: { selected: [] } };

/** No products at all: only Add new product. */
export const NoProducts: Story = {
  args: { selected: [] },
  decorators: [withAppData({ seed: seedEmpty })],
};

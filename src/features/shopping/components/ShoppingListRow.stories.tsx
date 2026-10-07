import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';
import { seedProductExtras } from '@/storybook/seeds/products';

import { ShoppingListRow } from './ShoppingListRow';

const meta = {
  title: 'Components/Shopping/ShoppingListRow',
  component: ShoppingListRow,
} satisfies Meta<typeof ShoppingListRow>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Today's "Shopping list · 2 to buy" row (the demo list). Opens the Shopping segment. */
export const ToBuy: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** More on the list: the count grows. */
export const MoreToBuy: Story = { decorators: [withAppData({ seed: seedProductExtras })] };

/** Nothing to buy: the row is hidden. */
export const NothingToBuy: Story = { decorators: [withAppData({ seed: seedEmpty })] };

import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';
import { seedProductExtras, seedShelf } from '@/storybook/seeds/products';

import { ProductsScreen } from './ProductsScreen';

const meta = {
  title: 'Screens/Products/Products',
  component: ProductsScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ProductsScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** P1 with products in every status, an avoided ingredient and a shopping list. */
export const Demo: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** P1 on a fresh install: the empty state. */
export const Empty: Story = { decorators: [withAppData({ seed: seedEmpty })] };

/** P1 shelf view: tiles with photos or the category glyph, two to a row. */
export const Shelf: Story = { decorators: [withAppData({ seed: seedShelf })] };

/** A long Lithuanian name and brand wrap in the list; a product with a photo. */
export const LongText: Story = { decorators: [withAppData({ seed: seedProductExtras })] };

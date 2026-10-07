import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { demoIds, FIXTURE_TODAY, seedDemo, seedEmpty } from '@/storybook/fixtures';
import { productStoryIds, seedProductExtras } from '@/storybook/seeds/products';

import { ProductFormScreen } from './ProductFormScreen';

const meta = {
  title: 'Screens/Modals/Product form',
  component: ProductFormScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ProductFormScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** P3 Add product, the short form: name, used on, "Is it open?" (Yes, today) and Use within. */
export const Add: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** The very first product: the "Your first product" title. */
export const AddFirst: Story = { decorators: [withAppData({ seed: seedEmpty })] };

/**
 * Add product from a bought shopping item (the demo's lip balm): the name and area filled in,
 * and saving links the item to the new product.
 */
export const AddFromShopping: Story = {
  decorators: [
    withAppData({
      seed: seedDemo,
      params: {
        prefill: JSON.stringify({
          name: 'Lip Balm',
          brand: '',
          area: 'skin',
          category: 'other',
          purchasedAt: FIXTURE_TODAY,
          openedAt: null,
          expiresAt: null,
          paoMonths: '',
          ingredients: '',
        }),
        fromShoppingItem: String(demoIds.shoppingItems.lipBalm),
      },
    }),
  ],
};

/** Edit product, the full form: the retinol with every field, ingredients and the expiry line. */
export const Edit: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { id: String(demoIds.products.retinol) } })],
};

/** Edit a product with a photo. */
export const EditWithPhoto: Story = {
  decorators: [
    withAppData({
      seed: seedProductExtras,
      params: { id: String(productStoryIds.products.rosehipOil) },
    }),
  ],
};

/** Edit with long Lithuanian text in the name, brand, notes and ingredients. */
export const EditLongText: Story = {
  decorators: [
    withAppData({
      seed: seedProductExtras,
      params: { id: String(productStoryIds.products.longName) },
    }),
  ],
};

/** Edit while the product loads: the skeleton (an id that doesn't exist stays here). */
export const EditLoading: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { id: '999' } })],
};

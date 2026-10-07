import type { Meta, StoryObj } from '@storybook/react-native';

import { momentOf } from '@/lib/appDay';
import { withAppData } from '@/storybook/appData';
import { demoIds, FIXTURE_TODAY, seedEmpty } from '@/storybook/fixtures';
import { sampleShoppingItem } from '@/storybook/seeds/products';

import { ShoppingRow, type ShoppingRowProps } from './ShoppingRow';

const meta = {
  title: 'Components/Shopping/ShoppingRow',
  component: ShoppingRow,
  // Partial: the callbacks stay unset, so Actions logs them.
  args: { item: sampleShoppingItem() } as Partial<ShoppingRowProps>,
  argTypes: {
    onToggle: { action: 'toggled' },
    onLongPress: { action: 'long pressed' },
  },
  // Prices and dates follow the app's settings and day.
  decorators: [withAppData({ seed: seedEmpty })],
} satisfies Meta<typeof ShoppingRow>;

export default meta;

type Story = StoryObj<typeof meta>;

/** To buy, free text: name, Hair tag and the note. Tap the row to tick it. */
export const ToBuy: Story = {};

/** Buy again, linked to a finished product: last price and size, and the rating line. */
export const BuyAgain: Story = {
  args: {
    item: sampleShoppingItem({
      id: demoIds.shoppingItems.clayMask,
      productId: demoIds.products.clayMask,
      name: 'Green Clay Mask',
      brand: 'Sol Care',
      area: 'skin',
      note: null,
      category: 'mask',
      priceCents: 1400,
      size: 75,
      unit: 'ml',
      rating: 2,
      wouldRebuy: false,
    }),
  },
};

/** Want to try: the "Move to To buy" button under the row. */
export const WantToTry: Story = {
  args: {
    item: sampleShoppingItem({
      id: demoIds.shoppingItems.hydratingToner,
      name: 'Hydrating Toner',
      brand: 'Lumi Lab',
      area: 'skin',
      note: null,
      list: 'want_to_try',
    }),
    onMoveToBuy: () => {},
  },
};

/** Bought today and not in Products yet: struck through, and "Add it to your products". */
export const BoughtNeedsProduct: Story = {
  args: {
    item: sampleShoppingItem({
      id: demoIds.shoppingItems.lipBalm,
      name: 'Lip Balm',
      area: 'skin',
      note: null,
      boughtAt: momentOf(FIXTURE_TODAY, '12:00'),
      needsProduct: true,
    }),
    onAddProduct: () => {},
  },
};

/** No area: no tag. */
export const NoArea: Story = {
  args: { item: sampleShoppingItem({ name: 'Cotton pads', area: null, note: null }) },
};

/** Long Lithuanian name, brand and note wrap. */
export const LongText: Story = {
  args: {
    item: sampleShoppingItem({
      id: 5,
      name: 'Švelnus micelinis vanduo jautriai ir sausai odai',
      brand: 'Baltijos natūralios kosmetikos laboratorija',
      area: 'skin',
      note: 'Pirkti didesnę pakuotę, kai vaistinėje bus nuolaida',
    }),
  },
};

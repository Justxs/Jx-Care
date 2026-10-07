import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { withAppData } from '@/storybook/appData';
import { demoIds, seedDemo, seedEmpty } from '@/storybook/fixtures';
import { productStoryIds, sampleShoppingItem, seedProductExtras } from '@/storybook/seeds/products';

import { ShoppingItemSheet, type ShoppingItemSheetProps } from './ShoppingItemSheet';

const meta = {
  title: 'Components/Shopping/ShoppingItemSheet',
  component: ShoppingItemSheet,
  // Partial: onClose stays unset, so Actions logs it.
  args: {} as Partial<ShoppingItemSheetProps>,
  argTypes: { onClose: { action: 'closed' } },
  // Opens at once; "Open sheet" (developer button) brings it back after it closes.
  render: function ShoppingSheetStory(args) {
    const [sheet, setSheet] = useState({ key: 0, open: true });
    return (
      <View>
        <Button
          variant="secondary"
          onPress={() => setSheet((s) => ({ key: s.key + 1, open: true }))}
        >
          Open sheet
        </Button>
        <ShoppingItemSheet
          key={sheet.key}
          {...args}
          open={sheet.open}
          onClose={() => {
            setSheet((s) => ({ ...s, open: false }));
            args.onClose?.();
          }}
        />
      </View>
    );
  },
} satisfies Meta<typeof ShoppingItemSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * P7 Add item on Buy again: search and pick any product, finished ones too. Switch to New item
 * for the name, brand, area, list and note fields.
 */
export const BuyAgain: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** No products yet: the Buy again list is empty and Add item stays off. */
export const NoProducts: Story = { decorators: [withAppData({ seed: seedEmpty })] };

/** Editing a To buy item: the New item fields, filled. */
export const Edit: Story = {
  args: {
    editing: sampleShoppingItem({ id: demoIds.shoppingItems.hairOil }),
  },
  decorators: [withAppData({ seed: seedDemo })],
};

/** Editing an item with a long Lithuanian name, brand and note. */
export const EditLongText: Story = {
  args: {
    editing: sampleShoppingItem({
      id: productStoryIds.shoppingItems.longName,
      name: 'Švelnus micelinis vanduo jautriai ir sausai odai',
      brand: 'Baltijos natūralios kosmetikos laboratorija',
      area: 'skin',
      note: 'Pirkti didesnę pakuotę, kai vaistinėje bus nuolaida',
    }),
  },
  decorators: [withAppData({ seed: seedProductExtras })],
};

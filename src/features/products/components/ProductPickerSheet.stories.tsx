import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { withAppData } from '@/storybook/appData';
import { demoIds, seedDemo, seedEmpty } from '@/storybook/fixtures';
import { seedProductExtras } from '@/storybook/seeds/products';

import { ProductPickerSheet, type ProductPickerSheetProps } from './ProductPickerSheet';

const meta = {
  title: 'Components/Products/ProductPickerSheet',
  component: ProductPickerSheet,
  // Partial: the callbacks stay unset, so Actions logs them.
  args: { area: 'skin', multiple: false, selected: [] } as Partial<ProductPickerSheetProps>,
  argTypes: {
    area: { control: 'radio', options: ['skin', 'hair', 'any'] },
    multiple: { control: 'boolean' },
    onClose: { action: 'closed' },
    onPick: { action: 'picked' },
    onAddNew: { action: 'add new' },
  },
  // Opens at once; "Open sheet" (developer button) brings it back after it closes.
  render: function PickerSheetStory(args) {
    const [sheet, setSheet] = useState({ key: 0, open: true });
    return (
      <View>
        <Button
          variant="secondary"
          onPress={() => setSheet((s) => ({ key: s.key + 1, open: true }))}
        >
          Open sheet
        </Button>
        <ProductPickerSheet
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
} satisfies Meta<typeof ProductPickerSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * R4 for a skin routine step: Recent (from the demo routines), All products, and the expired
 * sunscreen under "Can't be picked". Tapping a row picks it and closes.
 */
export const SkinStep: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** Hair task products, several at once: checkboxes and Done; the shampoo is already chosen. */
export const HairMultiple: Story = {
  args: { area: 'hair', multiple: true, selected: [demoIds.products.shampoo] },
  decorators: [withAppData({ seed: seedDemo })],
};

/** No products yet: the empty line and Add new product. */
export const NoProducts: Story = { decorators: [withAppData({ seed: seedEmpty })] };

/** Every product, with a photo row and a long Lithuanian name. */
export const AnyAreaLongNames: Story = {
  args: { area: 'any' },
  decorators: [withAppData({ seed: seedProductExtras })],
};

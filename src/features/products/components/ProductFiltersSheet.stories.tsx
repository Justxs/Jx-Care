import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';

import { defaultProductFilters } from '../types';
import { ProductFiltersSheet, type ProductFiltersSheetProps } from './ProductFiltersSheet';

const meta = {
  title: 'Components/Products/ProductFiltersSheet',
  component: ProductFiltersSheet,
  // Partial: the callbacks stay unset, so Actions logs them.
  args: { value: defaultProductFilters } as Partial<ProductFiltersSheetProps>,
  argTypes: {
    onClose: { action: 'closed' },
    onApply: { action: 'applied' },
  },
  // Opens at once; "Open sheet" (developer button) brings it back after it closes.
  render: function FiltersSheetStory(args) {
    const [sheet, setSheet] = useState({ key: 0, open: true });
    return (
      <View>
        <Button
          variant="secondary"
          onPress={() => setSheet((s) => ({ key: s.key + 1, open: true }))}
        >
          Open sheet
        </Button>
        <ProductFiltersSheet
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
} satisfies Meta<typeof ProductFiltersSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/** No filters on: the Show button counts the demo products. */
export const Default: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** Skin, Expiring and Expired, avoided ingredients only, sorted by name. */
export const Filtered: Story = {
  args: {
    value: {
      ...defaultProductFilters,
      area: 'skin',
      statuses: ['expiring', 'expired'],
      avoidOnly: true,
      sort: 'name',
    },
  },
  decorators: [withAppData({ seed: seedDemo })],
};

/** Nothing to show: "Show 0 products". */
export const NoProducts: Story = { decorators: [withAppData({ seed: seedEmpty })] };

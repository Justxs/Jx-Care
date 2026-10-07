import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { productCategories } from '@/db/enums';
import { samplePhotoUri } from '@/storybook/seeds/ui-b';

import { ProductThumb } from './product-thumb';
import { Text } from './text';

const meta = {
  title: 'UI/ProductThumb',
  component: ProductThumb,
  args: { category: 'serum', size: 48 },
  argTypes: {
    category: { control: 'select', options: [...productCategories] },
    size: { control: { type: 'number', min: 24, max: 120, step: 4 } },
    src: { control: 'text' },
  },
} satisfies Meta<typeof ProductThumb>;

export default meta;

type Story = StoryObj<typeof meta>;

/** No photo: the category glyph on a subtle square. */
export const Glyph: Story = {};

/** The product's own photo, cropped to fill. */
export const Photo: Story = { args: { src: samplePhotoUri } };

/** The larger thumb used on product detail. */
export const Large: Story = { args: { size: 96, category: 'spf' } };

/** Every category's glyph (several share one). */
export const AllCategories: Story = {
  render: function AllCategories() {
    const { t } = useTranslation();
    return (
      <View className="flex-row flex-wrap gap-3">
        {productCategories.map((category) => (
          <View key={category} className="w-[72px] items-center gap-1">
            <ProductThumb category={category} />
            <Text numberOfLines={1} className="text-caption text-ink-muted">
              {t(`products.categories.${category}`)}
            </Text>
          </View>
        ))}
      </View>
    );
  },
};

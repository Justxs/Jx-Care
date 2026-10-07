import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { addDays } from '@/lib/appDay';
import { withAppData } from '@/storybook/appData';
import { FIXTURE_TODAY, seedEmpty } from '@/storybook/fixtures';
import { samplePhotoUri, sampleProduct } from '@/storybook/seeds/products';

import { ProductTile, type ProductTileProps } from './ProductTile';

const day = (n: number) => addDays(FIXTURE_TODAY, n);

const meta = {
  title: 'Components/Products/ProductTile',
  component: ProductTile,
  // Partial: the callbacks stay unset, so Actions logs them.
  args: {
    item: sampleProduct(),
    width: 172,
    selecting: false,
    selected: false,
  } as Partial<ProductTileProps>,
  argTypes: {
    width: { control: { type: 'range', min: 120, max: 240, step: 4 } },
    selecting: { control: 'boolean' },
    selected: { control: 'boolean' },
    onPress: { action: 'pressed' },
    onLongPress: { action: 'long pressed' },
    onSelectedChange: { action: 'selected changed' },
  },
  decorators: [withAppData({ seed: seedEmpty })],
} satisfies Meta<typeof ProductTile>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Skin product without a photo: the category glyph on the skin colour, Expiring. */
export const Expiring: Story = {};

/** With a photo, OK (no badge). */
export const WithPhoto: Story = {
  args: {
    item: sampleProduct({
      id: 10,
      name: 'Rosehip Face Oil',
      brand: 'Nordic Skin',
      photoUri: samplePhotoUri,
      expiresAt: null,
      openedAt: day(-14),
      paoMonths: 6,
      status: 'ok',
      daysLeft: 168,
      effectiveExpiry: day(168),
    }),
  },
};

/** Hair product on the hair colour, with an avoided ingredient. */
export const HairAvoided: Story = {
  args: {
    item: sampleProduct({
      id: 8,
      name: 'Silk Conditioner',
      brand: 'Hair Studio',
      area: 'hair',
      category: 'conditioner',
      expiresAt: null,
      openedAt: null,
      status: 'nodate',
      daysLeft: null,
      effectiveExpiry: null,
      avoid: true,
    }),
  },
};

/** Expired: the badge carries the date. */
export const Expired: Story = {
  args: {
    item: sampleProduct({
      id: 5,
      name: 'Daily Fluid SPF 50',
      brand: 'Sol Care',
      category: 'spf',
      openedAt: day(-150),
      expiresAt: day(-5),
      status: 'expired',
      daysLeft: -5,
      effectiveExpiry: day(-5),
    }),
  },
};

/** Select mode, picked: the checkbox and the accent border. */
export const Selected: Story = { args: { selecting: true, selected: true } };

/** A long Lithuanian name stops at two lines. */
export const LongName: Story = {
  args: {
    item: sampleProduct({
      id: 11,
      name: 'Drėkinamasis veido kremas su hialurono rūgštimi ir ceramidais jautriai odai',
      brand: 'Baltijos natūralios kosmetikos laboratorija',
      category: 'moisturiser',
      expiresAt: day(20),
      effectiveExpiry: day(20),
      daysLeft: 20,
      avoid: true,
    }),
  },
};

/** Two tiles side by side, as on the shelf. */
export const Pair: Story = {
  render: (args) => (
    <View className="flex-row gap-3">
      <ProductTile {...args} />
      <ProductTile
        {...args}
        item={sampleProduct({
          id: 7,
          name: 'Repair Shampoo',
          brand: 'Hair Studio',
          area: 'hair',
          category: 'shampoo',
          expiresAt: null,
          openedAt: day(-20),
          paoMonths: 12,
          status: 'ok',
          daysLeft: 345,
          effectiveExpiry: day(345),
        })}
      />
    </View>
  ),
};

import type { Meta, StoryObj } from '@storybook/react-native';
import { useTranslation } from 'react-i18next';

import { addDays } from '@/lib/appDay';
import { withAppData } from '@/storybook/appData';
import { FIXTURE_TODAY, seedEmpty } from '@/storybook/fixtures';
import { samplePhotoUri, sampleProduct } from '@/storybook/seeds/products';

import { ProductRow, type ProductRowProps, type RowAction } from './ProductRow';

const day = (n: number) => addDays(FIXTURE_TODAY, n);
const noop = () => {};

const meta = {
  title: 'Components/Products/ProductRow',
  component: ProductRow,
  // Partial: onPress and onSelectedChange stay unset, so Actions logs them.
  args: { item: sampleProduct(), selecting: false, selected: false } as Partial<ProductRowProps>,
  argTypes: {
    selecting: { control: 'boolean' },
    selected: { control: 'boolean' },
    onPress: { action: 'pressed' },
    onSelectedChange: { action: 'selected changed' },
  },
  // Dates follow the app's settings and day.
  decorators: [withAppData({ seed: seedEmpty })],
  // The swipe and long-press actions the Products list gives a row, in the toolbar's language.
  render: function ProductRowStory(args) {
    const { t } = useTranslation();
    const actions: RowAction[] = [];
    if (!args.item.openedAt) {
      actions.push({
        key: 'markOpened',
        label: t('products.markOpened'),
        icon: 'package-open',
        onPress: noop,
      });
    }
    actions.push(
      {
        key: 'markFinished',
        label: t('common.markFinished'),
        icon: 'archive',
        primary: true,
        onPress: noop,
      },
      { key: 'duplicate', label: t('products.duplicate'), icon: 'copy', onPress: noop },
    );
    return <ProductRow {...args} actions={actions} />;
  },
} satisfies Meta<typeof ProductRow>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Expiring: the date line and the Expiring badge. Swipe left or long press for actions. */
export const Expiring: Story = {};

/** OK: no badge, only the date line. */
export const Ok: Story = {
  args: {
    item: sampleProduct({
      id: 1,
      name: 'Gentle Foaming Cleanser',
      category: 'cleanser',
      expiresAt: null,
      openedAt: day(-60),
      paoMonths: 12,
      status: 'ok',
      daysLeft: 305,
      effectiveExpiry: day(305),
    }),
  },
};

/** Expired: the badge carries the date; the line says when it was opened. */
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

/** Not opened yet: the swipe offers Mark opened too. */
export const NotOpened: Story = {
  args: {
    item: sampleProduct({
      id: 4,
      name: 'Glycolic Acid 7% Toner',
      brand: 'Nordic Skin',
      category: 'toner',
      openedAt: null,
      expiresAt: day(400),
      status: 'unopened',
      daysLeft: 400,
      effectiveExpiry: day(400),
    }),
  },
};

/** No dates at all: the No date badge and no date line. */
export const NoDate: Story = {
  args: {
    item: sampleProduct({
      id: 6,
      name: 'Barrier Cream',
      category: 'moisturiser',
      expiresAt: null,
      openedAt: null,
      status: 'nodate',
      daysLeft: null,
      effectiveExpiry: null,
    }),
  },
};

/** A hair product with an avoided ingredient: the Hair tag and the Avoid badge. */
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

/** With a photo instead of the category glyph. */
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

/** Select mode (Mark finished on several): a checkbox, and the whole row toggles it. */
export const Selecting: Story = { args: { selecting: true, selected: true } };

/** A long Lithuanian name wraps; the brand line stays on one line. */
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

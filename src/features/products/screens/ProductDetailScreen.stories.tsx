import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { demoIds, seedDemo } from '@/storybook/fixtures';
import { productStoryIds, seedProductExtras } from '@/storybook/seeds/products';

import { ProductDetailScreen } from './ProductDetailScreen';

const meta = {
  title: 'Screens/Products/Product detail',
  component: ProductDetailScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ProductDetailScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

const demoProduct = (id: number) => withAppData({ seed: seedDemo, params: { id: String(id) } });
const extraProduct = (id: number) =>
  withAppData({ seed: seedProductExtras, params: { id: String(id) } });

/** P2 retinol: OK with its progress bar, ingredients, used in routines, notes and 4 stars. */
export const Retinol: Story = { decorators: [demoProduct(demoIds.products.retinol)] };

/** Vitamin C: Expiring in 12 days. */
export const Expiring: Story = { decorators: [demoProduct(demoIds.products.vitaminC)] };

/** Sunscreen: Expired, still in the morning routine. */
export const Expired: Story = { decorators: [demoProduct(demoIds.products.sunscreen)] };

/** Glycolic toner: Not opened; the menu offers Mark opened. */
export const NotOpened: Story = { decorators: [demoProduct(demoIds.products.glycolicToner)] };

/** Conditioner: hair, no dates, an avoided ingredient (Parfum), used in the Wash task. */
export const HairAvoided: Story = { decorators: [demoProduct(demoIds.products.conditioner)] };

/** Clay mask: finished, with its cost per day; Restore and Buy again instead of Mark finished. */
export const Finished: Story = { decorators: [demoProduct(demoIds.products.clayMask)] };

/** Rosehip oil with a photo: tap it for the full-screen viewer. */
export const WithPhoto: Story = { decorators: [extraProduct(productStoryIds.products.rosehipOil)] };

/** Long Lithuanian name, brand, notes and ingredients wrap. */
export const LongText: Story = { decorators: [extraProduct(productStoryIds.products.longName)] };

/** An id that no longer exists (an old reminder): "This product was deleted" and Back. */
export const Missing: Story = { decorators: [demoProduct(999)] };

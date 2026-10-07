import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  ConflictCard,
  HairCard,
  IngredientsCard,
  PhotoCard,
  ProductDetailCard,
  ProductsCard,
  RoutineCard,
  ShoppingCard,
  StreakCard,
} from './sample-cards';
import { TodayPhone } from './today-phone';

const meta = {
  title: 'Landing/Showcase',
  component: ProductsCard,
  decorators: [
    (Story) => (
      <div className="w-84">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProductsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Products: Story = {};
export const Conflict: Story = { render: () => <ConflictCard /> };
export const ProductDetail: Story = { render: () => <ProductDetailCard /> };
export const Routine: Story = { render: () => <RoutineCard /> };
export const Streak: Story = { render: () => <StreakCard /> };
export const Hair: Story = { render: () => <HairCard /> };
export const Ingredients: Story = { render: () => <IngredientsCard /> };
export const Photos: Story = { render: () => <PhotoCard /> };
export const Shopping: Story = { render: () => <ShoppingCard /> };

export const Phone: Story = {
  decorators: [(Story) => <Story />],
  render: () => <TodayPhone />,
};

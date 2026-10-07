import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo } from '@/storybook/fixtures';

import { useToday } from '../api';
import { ExpiringCard, type ExpiringCardProps } from './ExpiringCard';

/** The card with Today's own "Expiring soon" products from the demo data. */
function WithTodayProducts({ count, ...props }: ExpiringCardProps & { count: number }) {
  const { expiring } = useToday();
  if (!expiring) return null;
  return <ExpiringCard {...props} products={expiring.slice(0, count)} />;
}

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<ExpiringCardProps, 'onProduct' | 'onSeeAll' | 'onShopping'>;

const meta = {
  title: 'Components/Today/ExpiringCard',
  component: ExpiringCard,
  decorators: [withAppData({ seed: seedDemo })],
  // Products come from the demo data (expired SPF first, then the vitamin C serum).
  args: { ...actions, products: [], toBuy: 2 },
  argTypes: {
    toBuy: { control: 'number' },
    onProduct: { action: 'product' },
    onSeeAll: { action: 'see all' },
    onShopping: { action: 'shopping list' },
  },
  render: (args) => <WithTodayProducts {...args} count={3} />,
} satisfies Meta<typeof ExpiringCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Expired and expiring products, then "Shopping list · 2 to buy". */
export const Demo: Story = {};

/** Nothing on the shopping list: no foot row. */
export const NoShoppingRow: Story = { args: { toBuy: null } };

/** A single product. */
export const OneProduct: Story = {
  render: (args) => <WithTodayProducts {...args} count={1} />,
};

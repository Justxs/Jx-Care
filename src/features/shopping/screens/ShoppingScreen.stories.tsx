import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';
import { seedProductExtras } from '@/storybook/seeds/products';

import { ShoppingScreen, ShoppingShareButton } from './ShoppingScreen';

const meta = {
  title: 'Screens/Products/Shopping',
  component: ShoppingScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ShoppingScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * P6 with the demo list: Suggested (expiring and expired products), To buy with a Buy again item,
 * Want to try, and a bought item offering "Add it to your products".
 */
export const Demo: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** A long Lithuanian name, brand and note on the To buy list. */
export const LongText: Story = { decorators: [withAppData({ seed: seedProductExtras })] };

/** Nothing on the list and nothing to suggest: the empty state. */
export const Empty: Story = { decorators: [withAppData({ seed: seedEmpty })] };

/** The header's Share word (shown in the Products header on this segment), with items to share. */
export const ShareButton: Story = {
  parameters: { layout: 'padded' },
  decorators: [withAppData({ seed: seedDemo })],
  render: () => <ShoppingShareButton />,
};

/** Share with an empty list: dimmed and off. */
export const ShareButtonEmpty: Story = {
  parameters: { layout: 'padded' },
  decorators: [withAppData({ seed: seedEmpty })],
  render: () => <ShoppingShareButton />,
};

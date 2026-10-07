import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';
import { seedLongNotes } from '@/storybook/seeds/settings';

import { IngredientsScreen } from './IngredientsScreen';

/**
 * S2 Ingredients and groups. The Groups tab, search, Select (merge) and the sheets work on the
 * story database.
 */
const meta = {
  title: 'Screens/Settings/Ingredients',
  component: IngredientsScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof IngredientsScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Every ingredient of the demo products and the common rules, with their groups. */
export const Demo: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** No ingredients and no groups yet. */
export const Empty: Story = { decorators: [withAppData({ seed: seedEmpty })] };

/** "L-Ascorbic acid" next to "Ascorbic acid": Select both to merge them. */
export const Duplicates: Story = { decorators: [withAppData({ seed: seedLongNotes })] };

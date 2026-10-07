import type { Meta, StoryObj } from '@storybook/react-native';

import { IngredientPills } from './IngredientPills';

const meta = {
  title: 'Components/Products/IngredientPills',
  component: IngredientPills,
  args: {
    items: [
      { name: 'Aqua' },
      { name: 'Glycerin' },
      { name: 'Ceramide NP' },
      { name: 'Niacinamide' },
    ],
  },
} satisfies Meta<typeof IngredientPills>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Known ingredients, nothing to flag. */
export const Plain: Story = {};

/** A new ingredient (New tag), an avoided one (red) and ones in a conflict rule (link icon). */
export const Flagged: Story = {
  args: {
    items: [
      { name: 'Aqua' },
      { name: 'Ascorbic acid', conflict: true },
      { name: 'Ferulic acid', isNew: true },
      { name: 'Parfum', avoided: true },
      { name: 'Retinol', conflict: true, isNew: true },
    ],
  },
};

/** Long Lithuanian names wrap onto new lines; a pill never clips. */
export const LongNames: Story = {
  args: {
    items: [
      { name: 'Natrio hialuronatas' },
      { name: 'Butyrospermum parkii (taukmedžio) sviestas', isNew: true },
      { name: 'Askorbo rūgšties gliukozidas', conflict: true },
      { name: 'Kvapiosios medžiagos (Parfum)', avoided: true },
    ],
  },
};

/** No ingredients: nothing is drawn. */
export const Empty: Story = { args: { items: [] } };

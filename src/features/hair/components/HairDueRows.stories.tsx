import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedEmpty } from '@/storybook/fixtures';
import { hairRowFixtures } from '@/storybook/seeds/hair';

import { HairDueRows, type HairDueRowsProps } from './HairDueRows';

const { wash, overdueWash, trim } = hairRowFixtures;

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<HairDueRowsProps, 'onOpen'>;

const meta = {
  title: 'Components/Hair/HairDueRows',
  component: HairDueRows,
  args: { ...actions, rows: [wash] },
  argTypes: { onOpen: { action: 'opened' } },
  // Dates and words follow the app's settings and the fixed story day.
  decorators: [withAppData({ seed: seedEmpty })],
} satisfies Meta<typeof HairDueRows>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Today's Hair card with the wash due: "Wash: Repair Shampoo + Silk Conditioner". */
export const DueToday: Story = {};

/** An overdue wash ("Overdue 2 days" in `warning`) and other care due the same day. */
export const OverdueAndOther: Story = {
  args: { rows: [overdueWash, { ...trim, state: 'due', nextDue: '2026-10-07' }] },
};

/** A task with no products shows its name alone. */
export const NoProducts: Story = {
  args: { rows: [{ ...wash, products: [], productNames: [], productIds: [] }] },
};

/** Long Lithuanian names and products wrap instead of clipping. */
export const LongLithuanianText: Story = {
  args: {
    rows: [
      {
        ...overdueWash,
        name: 'Plaukų plovimas',
        productNames: ['Atkuriamasis šampūnas pažeistiems plaukams', 'Šilkinis kondicionierius'],
        overdueDays: 14,
      },
    ],
  },
};

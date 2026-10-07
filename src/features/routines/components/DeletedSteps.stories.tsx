import type { Meta, StoryObj } from '@storybook/react-native';

import { DeletedSteps, type DeletedStepsProps } from './DeletedSteps';

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<DeletedStepsProps, 'onRestore'>;

const meta = {
  title: 'Components/Routines/DeletedSteps',
  component: DeletedSteps,
  args: {
    ...actions,
    steps: [
      { id: 4, label: 'Mineral Sunscreen SPF 50' },
      { id: 7, label: 'Hydrating mist' },
    ],
  },
  argTypes: { onRestore: { action: 'restore' } },
} satisfies Meta<typeof DeletedSteps>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Two deleted steps: a product and a note-only step. */
export const TwoSteps: Story = {};

/** A step without product or note reads "No product". */
export const NoProduct: Story = { args: { steps: [{ id: 9, label: 'No product' }] } };

/** Nothing deleted: nothing is drawn. */
export const None: Story = { args: { steps: [] } };

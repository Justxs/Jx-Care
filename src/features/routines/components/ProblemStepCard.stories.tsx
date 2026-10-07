import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedEmpty } from '@/storybook/fixtures';

import type { RoutineStepItem, StepProduct } from '../repo';
import { ProblemStepCard, type ProblemStepCardProps } from './ProblemStepCard';

const sunscreen: StepProduct = {
  id: 5,
  name: 'Daily Fluid SPF 50',
  brand: 'Sol Care',
  photoUri: null,
  area: 'skin',
  category: 'spf',
  archivedAt: null,
  status: 'expired',
  effectiveExpiry: '2026-10-02',
  daysLeft: -5,
  problem: 'expired',
};

const clayMask: StepProduct = {
  ...sunscreen,
  id: 9,
  name: 'Green Clay Mask',
  category: 'mask',
  archivedAt: '2026-09-27',
  status: 'ok',
  effectiveExpiry: null,
  daysLeft: null,
  problem: 'finished',
};

const step: RoutineStepItem = {
  id: 4,
  routineId: 1,
  productId: sunscreen.id,
  position: 3,
  note: null,
  scheduleKind: 'always',
  daysOfWeek: null,
  everyNDays: null,
  startDate: null,
  waitSeconds: 0,
  product: sunscreen,
};

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<ProblemStepCardProps, 'onToggle' | 'onPick'>;

const meta = {
  title: 'Components/Routines/ProblemStepCard',
  component: ProblemStepCard,
  // The expiry date is formatted with the settings' date format.
  decorators: [withAppData({ seed: seedEmpty })],
  args: { ...actions, step, index: 4, problem: 'expired', done: false, held: false },
  argTypes: {
    problem: { control: 'select', options: ['expired', 'finished', 'empty'] },
    done: { control: 'boolean' },
    held: { control: 'boolean' },
    onToggle: { action: 'toggled' },
    onPick: { action: 'pick another' },
    onBuyAgain: { action: 'buy again' },
  },
} satisfies Meta<typeof ProblemStepCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The product expired: red badge with the date, Pick another and Buy again. */
export const Expired: Story = {};

/** The product is finished: neutral badge. */
export const Finished: Story = {
  args: { problem: 'finished', step: { ...step, productId: clayMask.id, product: clayMask } },
};

/** No product yet: Pick a product, no Buy again. */
export const NoProduct: Story = {
  args: {
    problem: 'empty',
    step: { ...step, productId: null, product: null, note: 'Hydrating mist' },
  },
};

/** Ticked anyway: it keeps its checkbox, so the product can still be used today. */
export const Done: Story = { args: { done: true } };

/** Held by a running wait. */
export const Held: Story = { args: { held: true } };

/** With a conflict tag. */
export const Conflict: Story = { args: { conflict: { mild: false, onPress: () => {} } } };

/** Without Buy again (shopping not set up): only Pick another. */
export const NoBuyAgain: Story = { args: { onBuyAgain: null } };

import type { Meta, StoryObj } from '@storybook/react-native';

import type { RoutineStepItem, StepProduct } from '../repo';
import { PlayerStep, type PlayerStepProps } from './PlayerStep';

const vitaminC: StepProduct = {
  id: 2,
  name: 'Vitamin C 15% Serum',
  brand: 'Lumi Lab',
  photoUri: null,
  area: 'skin',
  category: 'serum',
  archivedAt: null,
  status: 'expiring',
  effectiveExpiry: '2026-10-19',
  daysLeft: 12,
  problem: null,
};

const step: RoutineStepItem = {
  id: 2,
  routineId: 1,
  productId: vitaminC.id,
  position: 1,
  note: null,
  scheduleKind: 'always',
  daysOfWeek: null,
  everyNDays: null,
  startDate: null,
  waitSeconds: 60,
  deletedAt: null,
  product: vitaminC,
};

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<PlayerStepProps, 'onToggle'>;

const meta = {
  title: 'Components/Routines/PlayerStep',
  component: PlayerStep,
  args: { ...actions, step, done: false, held: false, conflict: null },
  argTypes: {
    done: { control: 'boolean' },
    held: { control: 'boolean' },
    onToggle: { action: 'toggled' },
  },
} satisfies Meta<typeof PlayerStep>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A step to do: the whole row is the checkbox. */
export const ToDo: Story = {};

/** Ticked: the name turns muted, the row stays. */
export const Done: Story = { args: { done: true } };

/** A wait runs before this step: "Next, after the wait". */
export const Held: Story = { args: { held: true } };

/** A short note under the brand. */
export const WithNote: Story = {
  args: { step: { ...step, note: 'Two drops, pat in' } },
};

/** The step conflicts with a product in another routine today; the tag opens the sheet. */
export const Conflict: Story = {
  args: { conflict: { mild: false, onPress: () => {} } },
};

/** A mild conflict (an every-few-days step). */
export const MildConflict: Story = {
  args: { conflict: { mild: true, onPress: () => {} } },
};

/** A product without a brand. */
export const NoBrand: Story = {
  args: { step: { ...step, product: { ...vitaminC, brand: null } } },
};

/** Long names and notes wrap. */
export const LongText: Story = {
  args: {
    step: {
      ...step,
      note: 'Ant sausos odos, palaukti kol susigers, tada drėkiklis',
      product: {
        ...vitaminC,
        name: 'Antioksidacinis vitamino C 15 % ir ferulo rūgšties serumas',
        brand: 'Lumi Lab Professional',
      },
    },
    held: true,
  },
};

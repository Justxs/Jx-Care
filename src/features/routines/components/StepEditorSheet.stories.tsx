import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { FIXTURE_TODAY, demoIds, seedDemo } from '@/storybook/fixtures';

import { emptyStep, type StepFormValues } from '../schema';
import type { EditorProduct } from './editorProducts';
import { StepEditorSheet, type StepEditorSheetProps } from './StepEditorSheet';

const p = demoIds.products;

const products = new Map<number, EditorProduct>([
  [
    p.vitaminC,
    {
      id: p.vitaminC,
      name: 'Vitamin C 15% Serum',
      brand: 'Lumi Lab',
      photoUri: null,
      category: 'serum',
      problem: null,
    },
  ],
  [
    p.glycolicToner,
    {
      id: p.glycolicToner,
      name: 'Glycolic Acid 7% Toner',
      brand: 'Nordic Skin',
      photoUri: null,
      category: 'toner',
      problem: null,
    },
  ],
]);

const vitaminCStep: StepFormValues = {
  ...emptyStep,
  id: 2,
  productId: p.vitaminC,
  note: 'Two drops, pat in',
  waitSeconds: 60,
};

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<StepEditorSheetProps, 'onClose' | 'onSave' | 'onLeaveForProduct'>;

const meta = {
  title: 'Components/Routines/StepEditorSheet',
  component: StepEditorSheet,
  parameters: { layout: 'fullscreen' },
  // The product picker inside reads the demo products.
  decorators: [withAppData({ seed: seedDemo })],
  args: {
    ...actions,
    open: true,
    initial: vitaminCStep,
    isNew: false,
    routineDays: [1, 2, 3, 4, 5, 6, 7],
    products,
  },
  argTypes: {
    isNew: { control: 'boolean' },
    onClose: { action: 'closed' },
    onSave: { action: 'saved' },
    onLeaveForProduct: { action: 'leave for Add product' },
  },
} satisfies Meta<typeof StepEditorSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Editing a step: product, note, every time, a 1-minute wait. */
export const Edit: Story = {};

/** Adding a step: nothing chosen yet. */
export const New: Story = { args: { isNew: true, initial: emptyStep } };

/** Set days, limited to the days the routine runs on (weekdays here). */
export const SetDays: Story = {
  args: {
    routineDays: [1, 2, 3, 4, 5],
    initial: {
      ...vitaminCStep,
      productId: p.glycolicToner,
      note: null,
      scheduleKind: 'days',
      daysOfWeek: [2, 5],
      waitSeconds: 0,
    },
  },
};

/** Every few days, from a start date. */
export const EveryFewDays: Story = {
  args: {
    initial: {
      ...vitaminCStep,
      productId: p.glycolicToner,
      note: null,
      scheduleKind: 'interval',
      everyNDays: 3,
      startDate: FIXTURE_TODAY,
      waitSeconds: 0,
    },
  },
};

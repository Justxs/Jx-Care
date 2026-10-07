import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';

import { moveItem } from '../reorder';
import { StepList, type StepListProps } from './StepList';
import type { StepRowData } from './StepRow';

const row = (key: string, over: Partial<StepRowData>): StepRowData => ({
  key,
  product: null,
  note: null,
  schedule: null,
  wait: null,
  conflict: null,
  error: null,
  ...over,
});

const morning: StepRowData[] = [
  row('1', {
    product: {
      name: 'Gentle Foaming Cleanser',
      photoUri: null,
      category: 'cleanser',
      problem: null,
    },
  }),
  row('2', {
    product: { name: 'Vitamin C 15% Serum', photoUri: null, category: 'serum', problem: null },
    wait: '1 min',
  }),
  row('3', {
    product: { name: 'Barrier Cream', photoUri: null, category: 'moisturiser', problem: null },
  }),
  row('4', {
    product: { name: 'Daily Fluid SPF 50', photoUri: null, category: 'spf', problem: 'expired' },
  }),
];

const fromTemplate: StepRowData[] = [
  row('-1', {
    product: {
      name: 'Gentle Foaming Cleanser',
      photoUri: null,
      category: 'cleanser',
      problem: null,
    },
  }),
  row('-2', {
    product: { name: 'Glycolic Acid 7% Toner', photoUri: null, category: 'toner', problem: null },
    schedule: 'Every 3 days',
    conflict: { mild: true },
  }),
  row('-3', {}),
  row('-4', { note: 'Face massage', schedule: 'Tue, Fri' }),
];

/** Keeps the order, so dragging and swipe-to-delete work in the story; actions still log. */
function Reorderable(props: StepListProps) {
  const [steps, setSteps] = useState(props.steps);
  return (
    <StepList
      {...props}
      steps={steps}
      onMove={(from, to) => {
        props.onMove?.(from, to);
        setSteps((s) => moveItem(s, from, to));
      }}
      onRemove={(index) => {
        props.onRemove?.(index);
        setSteps((s) => s.filter((_, i) => i !== index));
      }}
    />
  );
}

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<StepListProps, 'onPress' | 'onMove' | 'onRemove'>;

const meta = {
  title: 'Components/Routines/StepList',
  component: StepList,
  args: { ...actions, steps: morning },
  argTypes: {
    onPress: { action: 'pressed' },
    onMove: { action: 'moved' },
    onRemove: { action: 'removed' },
    onDragActive: { action: 'drag active' },
  },
  render: (args) => <Reorderable {...args} />,
} satisfies Meta<typeof StepList>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A saved morning routine: drag a handle to reorder, swipe a row left to delete. */
export const Morning: Story = {};

/** Fresh from a template: a mild conflict, a gap to fill and a note-only step. */
export const FromTemplate: Story = { args: { steps: fromTemplate } };

/** A single step. */
export const OneStep: Story = { args: { steps: morning.slice(0, 1) } };

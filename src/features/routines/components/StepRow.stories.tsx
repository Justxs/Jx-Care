import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';

import { StepRow, type StepRowData, type StepRowProps } from './StepRow';

const step: StepRowData = {
  key: '2',
  product: {
    name: 'Vitamin C 15% Serum',
    photoUri: null,
    category: 'serum',
    problem: null,
  },
  note: null,
  schedule: null,
  wait: null,
  conflict: null,
  error: null,
};

/** What the list puts at the row's end (it wraps it in the drag gesture). */
const handle = (
  <View className="h-[72px] w-[48px] items-center justify-center">
    <Icon name="grip-vertical" size={20} tone="ink-muted" />
  </View>
);

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<StepRowProps, 'onPress' | 'onDelete' | 'onMove'>;

const meta = {
  title: 'Components/Routines/StepRow',
  component: StepRow,
  args: { ...actions, step, index: 1, count: 4, handle },
  argTypes: {
    onPress: { action: 'pressed' },
    onDelete: { action: 'deleted' },
    onMove: { action: 'moved' },
  },
} satisfies Meta<typeof StepRow>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A product, every time, no wait. */
export const Plain: Story = {};

/** Note, schedule and wait chips. */
export const WithChips: Story = {
  args: { step: { ...step, note: 'Two drops', schedule: 'Mon, Wed, Fri', wait: '1 min' } },
};

/** The product expired. */
export const Expired: Story = {
  args: {
    step: {
      ...step,
      product: { name: 'Daily Fluid SPF 50', photoUri: null, category: 'spf', problem: 'expired' },
    },
  },
};

/** The product is finished. */
export const Finished: Story = {
  args: {
    step: {
      ...step,
      product: { name: 'Green Clay Mask', photoUri: null, category: 'mask', problem: 'finished' },
    },
  },
};

/** A conflict with another routine; the tag opens the conflict sheet. */
export const Conflict: Story = {
  args: { step: { ...step, conflict: { mild: false, onPress: () => {} } } },
};

/** A mild conflict (every few days). */
export const MildConflict: Story = {
  args: { step: { ...step, schedule: 'Every 3 days', conflict: { mild: true } } },
};

/** From a template with no product: "Pick a product later" in amber. */
export const PickLater: Story = { args: { step: { ...step, product: null } } };

/** A step that is only a note. */
export const NoteOnly: Story = {
  args: { step: { ...step, product: null, note: 'Face massage' } },
};

/** A problem: set days the routine no longer runs on. */
export const WithError: Story = {
  args: {
    step: {
      ...step,
      schedule: 'Sat',
      error: 'Pick only days the routine runs on.',
    },
  },
};

/** Long Lithuanian text wraps. */
export const LongText: Story = {
  args: {
    step: {
      ...step,
      product: {
        name: 'Antioksidacinis vitamino C 15 % ir ferulo rūgšties serumas',
        photoUri: null,
        category: 'serum',
        problem: 'expired',
      },
      note: 'Ant sausos odos, palaukti kol susigers',
      schedule: 'Kas 3 dienas',
      wait: '10 min.',
      conflict: { mild: true },
    },
  },
};

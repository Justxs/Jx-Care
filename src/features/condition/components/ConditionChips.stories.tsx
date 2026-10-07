import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';

import { ConditionChips, type ConditionChipsProps } from './ConditionChips';

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<ConditionChipsProps, 'onToggle'>;

const meta = {
  title: 'Components/Condition/ConditionChips',
  component: ConditionChips,
  args: { ...actions, area: 'skin', value: ['dry', 'redness'] },
  argTypes: {
    area: { control: 'radio', options: ['skin', 'hair'] },
    value: { control: 'object' },
    onToggle: { action: 'toggled' },
  },
  // Taps toggle the chips; a new `value` from Controls starts over.
  render: function Chips(args) {
    const [value, setValue] = useState<readonly string[]>(args.value);
    return (
      <ConditionChips
        {...args}
        value={value}
        onToggle={(tag) => {
          setValue((v) => (v.includes(tag) ? v.filter((x) => x !== tag) : [...v, tag]));
          args.onToggle?.(tag);
        }}
      />
    );
  },
} satisfies Meta<typeof ConditionChips>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The seven skin chips, Dry and Redness picked. Switch to LT: long words wrap to a new line. */
export const Skin: Story = {};

/** The five hair chips. */
export const Hair: Story = { args: { area: 'hair', value: ['oily_roots'] } };

/** Nothing picked. */
export const NothingPicked: Story = { args: { value: [] } };

import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { Field, fieldBoxClass } from './field';
import { Text } from './text';

const meta = {
  title: 'UI/Field',
  component: Field,
  args: { label: 'Name', hint: 'As on the bottle', noHelper: false, children: null },
  argTypes: {
    label: { control: 'text' },
    hint: { control: 'text' },
    error: { control: 'text' },
    noHelper: { control: 'boolean' },
    children: { control: false },
    onLabelPress: { action: 'label pressed' },
  },
  // Any control goes in the middle; here a plain box styled like an input.
  render: (args) => (
    <Field {...args}>
      <View className={fieldBoxClass({ invalid: !!args.error })}>
        <Text className="text-body">Vitamin C serum</Text>
      </View>
    </Field>
  ),
} satisfies Meta<typeof Field>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Label above, control, and the hint in the reserved line. */
export const WithHint: Story = {};

/** The error replaces the hint in the same line, in danger, so nothing below moves. */
export const WithError: Story = { args: { error: 'Enter a name.' } };

/** Nothing to say: the line stays reserved (empty). */
export const EmptyHelper: Story = { args: { hint: undefined } };

/** `noHelper` drops the reserved line (fields that never show a hint or error). */
export const NoHelper: Story = { args: { hint: undefined, noHelper: true } };

export const NoLabel: Story = { args: { label: undefined } };

/** Error and hint lines in a stack: the second field never moves when the first shows an error. */
export const Stacked: Story = {
  render: (args) => (
    <View>
      <Field {...args} error="Enter a name.">
        <View className={fieldBoxClass({ invalid: true })} />
      </Field>
      <Field {...args} label="Brand" hint={undefined}>
        <View className={fieldBoxClass({})} />
      </Field>
      <Field {...args} label="Notes" hint={undefined} noHelper>
        <View className={fieldBoxClass({ disabled: true })} />
      </Field>
    </View>
  ),
};

/** A long Lithuanian label and error wrap. */
export const LongLithuanian: Story = {
  args: {
    label: 'Produkto pavadinimas, kaip parašyta ant buteliuko',
    error: 'Įveskite pavadinimą. Jis turi būti ne ilgesnis nei 80 simbolių.',
  },
};

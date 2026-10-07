import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { FieldButton } from './field-button';
import { icons } from './icon';
import { Input } from './input';

const meta = {
  title: 'UI/FieldButton',
  component: FieldButton,
  args: {
    label: 'Category',
    value: 'Serum',
    placeholder: 'Pick one',
    invalid: false,
    disabled: false,
    icon: 'chevron-down',
    valueLines: 1,
  },
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    placeholder: { control: 'text' },
    invalid: { control: 'boolean' },
    disabled: { control: 'boolean' },
    icon: { control: 'select', options: Object.keys(icons) },
    valueLines: { control: 'number' },
    onPress: { action: 'pressed' },
  },
} satisfies Meta<typeof FieldButton>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The trigger select, date and time fields share. */
export const Filled: Story = {};

export const Placeholder: Story = { args: { value: undefined } };

export const Invalid: Story = { args: { value: undefined, invalid: true } };

export const Disabled: Story = { args: { disabled: true } };

export const DateTrigger: Story = { args: { value: 'Today, 7 Oct', icon: 'calendar' } };

/** A long recovery question wraps to two lines before it is cut off. */
export const LongValueTwoLines: Story = {
  args: {
    value: 'Kaip vadinosi gatvė, kurioje gyvenote vaikystėje, kai ėjote į pirmąją klasę?',
    valueLines: 2,
  },
};

/** Same 48 pt box as an Input, so mixed rows line up. */
export const BesideInput: Story = {
  render: (args) => (
    <View className="flex-row items-start gap-2">
      <View className="flex-1">
        <Input label="Size" keyboard="numeric" value="50" noHelper />
      </View>
      <View className="flex-1 pt-[26px]">
        <FieldButton {...args} label="Unit" value="ml" />
      </View>
    </View>
  ),
};

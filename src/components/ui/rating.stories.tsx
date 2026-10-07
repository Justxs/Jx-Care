import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';

import { Rating, type RatingProps } from './rating';

/** Keeps the rating so taps change it; a new `value` from Controls starts over. */
function StatefulRating(props: RatingProps) {
  const [value, setValue] = useState(props.value);
  return (
    <Rating
      {...props}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        props.onValueChange?.(v);
      }}
    />
  );
}

const meta = {
  title: 'UI/Rating',
  component: Rating,
  args: { value: 3, max: 5, clearable: false, disabled: false },
  argTypes: {
    value: { control: { type: 'number', min: 0, max: 5, step: 1 } },
    max: { control: { type: 'number', min: 1, max: 10, step: 1 } },
    clearable: { control: 'boolean' },
    disabled: { control: 'boolean' },
    onValueChange: { action: 'changed' },
  },
  render: (args) => <StatefulRating key={args.value} {...args} />,
} satisfies Meta<typeof Rating>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Product rating: stars up to the value fill. */
export const Stars: Story = {};

/** Not rated yet (0). */
export const Unrated: Story = { args: { value: 0 } };

/** Tapping the picked star again clears the rating. */
export const Clearable: Story = { args: { clearable: true } };

/** Shown, not editable (a finished product's rating in a list). */
export const Disabled: Story = { args: { disabled: true, value: 4 } };

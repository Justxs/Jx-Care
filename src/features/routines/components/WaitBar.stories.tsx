import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { WaitBar, type WaitBarProps } from './WaitBar';

/** Empty at runtime: the action argTypes fill the callbacks; this types them for the stories. */
const actions = {} as Pick<WaitBarProps, 'onSkip'>;

const meta = {
  title: 'Components/Routines/WaitBar',
  component: WaitBar,
  parameters: { layout: 'fullscreen' },
  args: { ...actions, remaining: 60 },
  argTypes: {
    remaining: { control: { type: 'number', min: 0, max: 1200, step: 1 } },
    onSkip: { action: 'skip wait' },
    onHeight: { action: 'height' },
  },
  // The bar floats at the bottom of the player.
  render: (args) => (
    <View className="flex-1">
      <WaitBar {...args} />
    </View>
  ),
} satisfies Meta<typeof WaitBar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A one-minute wait after vitamin C. */
export const OneMinute: Story = {};

/** The longest wait (20 min). */
export const Long: Story = { args: { remaining: 1200 } };

/** The last seconds. */
export const AlmostDone: Story = { args: { remaining: 5 } };

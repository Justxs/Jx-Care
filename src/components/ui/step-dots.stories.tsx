import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from './button';
import { StepDots } from './step-dots';

const meta = {
  title: 'UI/StepDots',
  component: StepDots,
  args: { count: 5, index: 1 },
  argTypes: {
    count: { control: { type: 'number', min: 1, max: 10, step: 1 } },
    index: { control: { type: 'number', min: 0, max: 9, step: 1 } },
  },
} satisfies Meta<typeof StepDots>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Step 2 of 5: done dots in accent, the current one wide. */
export const SecondStep: Story = {};

/** The first step. */
export const FirstStep: Story = { args: { index: 0 } };

/** The last step: every dot in accent. */
export const LastStep: Story = { args: { index: 4 } };

/** Continue moves the wide dot (instant with Reduce Motion). */
export const Animates: Story = {
  render: function Animates(args) {
    const { t } = useTranslation();
    const [index, setIndex] = useState(0);
    return (
      <View className="gap-4">
        <StepDots {...args} index={index} />
        <Button onPress={() => setIndex((i) => (i + 1) % args.count)}>
          {t('common.continue')}
        </Button>
      </View>
    );
  },
};

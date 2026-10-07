import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

import { OnboardingFrame, type OnboardingFrameProps } from './OnboardingFrame';

/** A title and a line of body text in the frame, translated. */
function Body() {
  const { t } = useTranslation();
  return (
    <View className="gap-2 px-6 pt-6">
      <Text accessibilityRole="header" className="text-center text-title-l">
        {t('onboarding.recoveryTitle')}
      </Text>
      <Text className="text-center text-body text-ink-muted">{t('onboarding.recoveryBody')}</Text>
    </View>
  );
}

const meta = {
  title: 'Components/Onboarding/OnboardingFrame',
  component: OnboardingFrame,
  parameters: { layout: 'fullscreen' },
  args: { step: 3, children: null },
  argTypes: {
    step: { control: { type: 'number', min: 0, max: 4, step: 1 } },
    onBack: { action: 'back' },
  },
  render: function Frame(args: OnboardingFrameProps) {
    const { t } = useTranslation();
    return (
      <OnboardingFrame {...args} footer={<Button>{t('common.continue')}</Button>}>
        <Body />
      </OnboardingFrame>
    );
  },
} satisfies Meta<typeof OnboardingFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A middle step: Back, the step dots and a pinned Continue. */
export const WithFooter: Story = {};

/** O1: no Back arrow. */
export const FirstStep: Story = { args: { step: 0 } };

/** Without pinned buttons (the PIN steps). */
export const NoFooter: Story = {
  args: { step: 1 },
  render: function NoFooter(args: OnboardingFrameProps) {
    return (
      <OnboardingFrame {...args}>
        <Body />
      </OnboardingFrame>
    );
  },
};

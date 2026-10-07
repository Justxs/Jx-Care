import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/text';

import { Logo } from './Logo';

const meta = {
  title: 'Components/Shared/Logo',
  component: Logo,
  args: { size: 64 },
  argTypes: {
    size: { control: 'number' },
    accessibilityLabel: { control: 'text' },
  },
} satisfies Meta<typeof Logo>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The spa-day frog in brand pink; switch Light/Dark in the toolbar. */
export const Default: Story = {};

/** Large, as on the lock and onboarding screens; spoken as an image. */
export const Large: Story = { args: { size: 168, accessibilityLabel: 'Jx Care' } };

/** Sizes keep the 7:6 ratio. */
export const Sizes: Story = {
  render: () => (
    <View className="flex-row items-end gap-4">
      {[24, 40, 64, 96].map((size) => (
        <Logo key={size} size={size} />
      ))}
    </View>
  ),
};

/** Beside the app name, the mark is decorative (no label). */
export const WithAppName: Story = {
  render: function WithAppName() {
    const { t } = useTranslation();
    return (
      <View className="flex-row items-center gap-3">
        <Logo size={40} />
        <Text className="text-title-l">{t('common.appName')}</Text>
      </View>
    );
  },
};

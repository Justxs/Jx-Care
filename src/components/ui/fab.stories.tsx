import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Fab, type FabProps } from './fab';
import { icons } from './icon';
import { Text } from './text';

const meta = {
  title: 'UI/Fab',
  component: Fab,
  parameters: { layout: 'fullscreen' },
  args: {
    children: 'Add product',
    icon: 'plus',
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<FabProps, 'onPress'>),
  },
  argTypes: {
    children: { control: 'text' },
    icon: { control: 'select', options: Object.keys(icons) },
    onPress: { action: 'pressed' },
  },
  decorators: [
    // The Fab is absolutely placed, bottom right of its list screen.
    (Story) => (
      <View className="flex-1 p-4">
        <Text className="text-body text-ink-muted">A list screen with its one add action.</Text>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof Fab>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AddProduct: Story = {};

/** Another icon (a photo). */
export const OtherIcon: Story = { args: { children: 'Add photo', icon: 'camera' } };

/** Translated: the label is always shown, verb first. */
export const Translated: Story = {
  render: function Translated(args) {
    const { t } = useTranslation();
    return <Fab {...args}>{t('products.add')}</Fab>;
  },
};

/** A long Lithuanian label makes the pill wider. */
export const LongLithuanian: Story = { args: { children: 'Pridėti priežiūros produktą' } };

import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { MoreMenu, type MoreMenuItem } from './more-menu';
import { Text } from './text';

const noop = () => {};

const meta = {
  title: 'UI/MoreMenu',
  component: MoreMenu,
  args: {
    items: [
      { label: 'Edit', icon: 'pencil', onPress: noop },
      { label: 'Duplicate', icon: 'copy', onPress: noop },
      { label: 'Delete', icon: 'trash-2', destructive: true, onPress: noop },
    ],
  },
} satisfies Meta<typeof MoreMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The ⋯ trigger; tap it to open the menu. Items come from the Controls panel. */
export const Default: Story = {
  render: (args) => (
    <View className="items-end">
      <MoreMenu {...args} />
    </View>
  ),
};

/** Translated product actions; the line below names the last item picked. */
export const ProductActions: Story = {
  render: function ProductActions() {
    const { t } = useTranslation();
    const [picked, setPicked] = useState<string>();
    const item = (label: string, icon: MoreMenuItem['icon'], destructive?: boolean) => ({
      label,
      icon,
      destructive,
      onPress: () => setPicked(label),
    });
    return (
      <View className="items-end gap-3">
        <MoreMenu
          items={[
            item(t('common.edit'), 'pencil'),
            item(t('products.markOpened'), 'package-open'),
            item(t('products.duplicate'), 'copy'),
            item(t('common.markFinished'), 'archive'),
            item(t('common.delete'), 'trash-2', true),
          ]}
        />
        <Text className="text-caption text-ink-muted">{picked ?? '—'}</Text>
      </View>
    );
  },
};

/** A disabled item stays visible at 45 % and can't be tapped. */
export const WithDisabledItem: Story = {
  args: {
    items: [
      { label: 'Edit', icon: 'pencil', onPress: noop },
      { label: 'Share', icon: 'share-2', disabled: true, onPress: noop },
      { label: 'Delete', icon: 'trash-2', destructive: true, onPress: noop },
    ],
  },
  render: (args) => (
    <View className="items-end">
      <MoreMenu {...args} />
    </View>
  ),
};

/** Lithuanian labels run longer; the panel grows past its 220 pt minimum. */
export const LongLithuanian: Story = {
  args: {
    items: [
      { label: 'Pažymėti atidarytu', icon: 'package-open', onPress: noop },
      { label: 'Pažymėti kaip baigtą ir pirkti dar kartą', icon: 'archive', onPress: noop },
      { label: 'Ištrinti', icon: 'trash-2', destructive: true, onPress: noop },
    ],
  },
  render: (args) => (
    <View className="items-end">
      <MoreMenu {...args} />
    </View>
  ),
};

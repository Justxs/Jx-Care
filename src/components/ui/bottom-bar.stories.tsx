import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BottomBar } from './bottom-bar';
import { Button } from './button';
import { Input } from './input';
import { Text } from './text';

const meta = {
  title: 'UI/BottomBar',
  component: BottomBar,
  parameters: { layout: 'fullscreen' },
  args: { children: null },
  argTypes: { children: { control: false } },
  decorators: [
    // The bar sits at the bottom of a form screen, under the scrolling fields.
    (Story) => (
      <View className="flex-1 justify-end">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof BottomBar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The usual bar: one full-width primary Save. */
export const SaveOnly: Story = {
  render: function SaveOnly() {
    const { t } = useTranslation();
    return (
      <BottomBar>
        <Button>{t('products.form.saveProduct')}</Button>
      </BottomBar>
    );
  },
};

/** Primary Save with one ghost action under it. */
export const WithGhostAction: Story = {
  render: function WithGhostAction() {
    const { t } = useTranslation();
    return (
      <BottomBar>
        <Button>{t('products.form.saveProduct')}</Button>
        <Button variant="ghost">{t('products.form.saveAndAdd')}</Button>
      </BottomBar>
    );
  },
};

/** Focus the field: the bar rides above the keyboard. */
export const AboveKeyboard: Story = {
  render: function AboveKeyboard() {
    const { t } = useTranslation();
    return (
      <View className="flex-1 justify-between">
        <View className="gap-2 p-4">
          <Text className="text-body text-ink-muted">Tap the field to open the keyboard.</Text>
          <Input label={t('products.form.name')} placeholder={t('products.form.namePlaceholder')} />
        </View>
        <BottomBar>
          <Button>{t('common.save')}</Button>
        </BottomBar>
      </View>
    );
  },
};

/** Lithuanian labels wrap inside the bar instead of clipping. */
export const LongLithuanian: Story = {
  render: () => (
    <BottomBar>
      <Button>Išsaugoti produktą ir grįžti į sąrašą</Button>
      <Button variant="ghost">Išsaugoti ir pridėti dar vieną produktą</Button>
    </BottomBar>
  ),
};

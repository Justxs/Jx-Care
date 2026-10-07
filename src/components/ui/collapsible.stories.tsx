import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from './button';
import { Collapsible } from './collapsible';
import { Input } from './input';
import { Text } from './text';

const meta = {
  title: 'UI/Collapsible',
  component: Collapsible,
  args: { open: true, children: null },
  argTypes: { open: { control: 'boolean' }, children: { control: false } },
  render: (args) => (
    <View className="gap-2">
      <Collapsible {...args}>
        <Text className="text-body text-ink-muted">
          Late sections of a form open here; the fields under them glide down in 200 ms.
        </Text>
      </Collapsible>
      <Text className="text-body">The next field</Text>
    </View>
  ),
} satisfies Meta<typeof Collapsible>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = {};

/** Closed: zero height and hidden from screen readers. */
export const Closed: Story = { args: { open: false } };

/** "More details" in the product form: the button toggles the section. */
export const Toggle: Story = {
  render: function Toggle() {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    return (
      <View className="gap-2">
        <Input label={t('products.form.name')} placeholder={t('products.form.namePlaceholder')} />
        <Button variant="ghost" block={false} onPress={() => setOpen((o) => !o)}>
          {open ? t('products.form.fewerDetails') : t('products.form.moreDetails')}
        </Button>
        <Collapsible open={open}>
          <View className="gap-1">
            <Input label={t('products.form.brand')} />
            <Input label={t('products.form.price')} keyboard="decimal" suffix="€" />
          </View>
        </Collapsible>
        <Input label={t('products.form.notes')} multiline />
      </View>
    );
  },
};

import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from './button';

const meta = {
  title: 'UI/Button',
  component: Button,
  args: {
    children: 'Save',
    variant: 'primary',
    size: 'md',
    block: true,
    loading: false,
    disabled: false,
  },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'radio', options: ['md', 'sm'] },
    icon: { control: 'select', options: [undefined, 'plus', 'trash-2', 'check', 'camera'] },
    block: { control: 'boolean' },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
    onPress: { action: 'pressed' },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: 'secondary', icon: 'plus', children: 'Edit' } };

export const Ghost: Story = { args: { variant: 'ghost', children: 'Cancel' } };

export const Danger: Story = { args: { variant: 'danger', icon: 'trash-2', children: 'Delete' } };

export const SmallLoading: Story = {
  args: { size: 'sm', block: false, loading: true, children: 'Continue' },
};

export const Disabled: Story = { args: { disabled: true } };

/** Lithuanian runs 20–30% longer: the label wraps instead of clipping. */
export const LongLabel: Story = {
  args: { children: 'Pažymėti kaip baigtą ir pridėti į pirkinių sąrašą' },
};

/** Every variant with translated labels; switch EN/LT in the toolbar. */
export const AllVariants: Story = {
  render: function AllVariants() {
    const { t } = useTranslation();
    return (
      <View className="gap-3">
        <Button>{t('common.save')}</Button>
        <Button variant="secondary" icon="plus">
          {t('common.edit')}
        </Button>
        <Button variant="ghost">{t('common.cancel')}</Button>
        <Button variant="danger" icon="trash-2">
          {t('common.delete')}
        </Button>
        <View className="flex-row gap-2">
          <Button size="sm" block={false} loading>
            {t('common.continue')}
          </Button>
          <Button size="sm" block={false} disabled>
            {t('common.done')}
          </Button>
        </View>
      </View>
    );
  },
};

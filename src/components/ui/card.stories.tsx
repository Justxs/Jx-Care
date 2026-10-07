import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from './card';
import { ListRow } from './list-row';
import { Separator } from './separator';
import { Text } from './text';

const meta = {
  title: 'UI/Card',
  component: Card,
  args: { title: 'Other care', flush: false, children: null },
  argTypes: {
    title: { control: 'text' },
    flush: { control: 'boolean' },
    children: { control: false },
  },
  render: (args) => (
    <Card {...args}>
      <Text className="text-body">Hair mask every Sunday, nail oil before bed.</Text>
    </Card>
  ),
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Sentence-case heading above a padded card. */
export const WithTitle: Story = {};

export const NoTitle: Story = { args: { title: undefined } };

/** `flush`: no padding, rows divided by inset Separators (Settings groups). */
export const FlushList: Story = {
  render: function FlushList() {
    const { t } = useTranslation();
    return (
      <Card title={t('common.timeOfDay')} flush>
        <ListRow label={t('common.morning')} icon="sun" value="07:30" onPress={() => {}} />
        <Separator inset />
        <ListRow label={t('common.evening')} icon="moon" value="21:00" onPress={() => {}} />
        <Separator inset />
        <ListRow label={t('common.weeklyPhoto')} trailing="switch" checked />
      </Card>
    );
  },
};

/** Cards stack with a gap; never one inside another. */
export const Stacked: Story = {
  render: function Stacked() {
    const { t } = useTranslation();
    return (
      <View className="gap-4">
        <Card title={t('common.skin')}>
          <Text className="text-body">{t('common.everyDay')}</Text>
        </Card>
        <Card title={t('common.hair')}>
          <Text className="text-body">{t('common.everyFewDays')}</Text>
        </Card>
      </View>
    );
  },
};

/** A long Lithuanian heading wraps over two lines. */
export const LongLithuanianTitle: Story = {
  args: { title: 'Kita priežiūra: kaukės, aliejai ir procedūros kartą per savaitę' },
};

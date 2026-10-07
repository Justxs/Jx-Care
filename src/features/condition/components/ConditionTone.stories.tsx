import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/text';
import { hairTags, skinTags } from '@/db/enums';

import { ConditionLegend, ConditionMark, ConditionPill } from './ConditionTone';

const meta = {
  title: 'Components/Condition/ConditionTone',
  component: ConditionMark,
  args: { states: ['breakout', 'oily'] },
  argTypes: { states: { control: 'object' } },
} satisfies Meta<typeof ConditionMark>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The Condition view's day mark: the main state's bar and "+1" for one more state. */
export const MarkWithMore: Story = {};

/** One state: just the bar. */
export const MarkSingle: Story = { args: { states: ['calm'] } };

/** Nothing logged: the 18 pt row stays empty. */
export const MarkEmpty: Story = { args: { states: [] } };

/** Every skin state's bar, as the calendar draws them. */
export const AllMarks: Story = {
  render: () => (
    <View className="flex-row flex-wrap gap-4">
      {skinTags.map((state) => (
        <ConditionMark key={state} states={[state]} />
      ))}
    </View>
  ),
};

/** The legend under the grid: colour and word for each skin state. */
export const Legend: Story = { render: () => <ConditionLegend /> };

/** Logged tags as pills on Day detail: skin states in their colour, hair tags neutral. */
export const Pills: Story = {
  render: function Pills() {
    const { t } = useTranslation();
    return (
      <View className="gap-4">
        <Text className="text-label text-ink-muted">{t('common.skin')}</Text>
        <View className="flex-row flex-wrap gap-2">
          {skinTags.map((tag) => (
            <ConditionPill key={tag} area="skin" tag={tag} />
          ))}
        </View>
        <Text className="text-label text-ink-muted">{t('common.hair')}</Text>
        <View className="flex-row flex-wrap gap-2">
          {hairTags.map((tag) => (
            <ConditionPill key={tag} area="hair" tag={tag} />
          ))}
        </View>
      </View>
    );
  },
};

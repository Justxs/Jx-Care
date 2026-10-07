import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Switch, type SwitchProps } from './switch';
import { Text } from './text';

/** Keeps the state so taps flip it; a new `checked` from Controls starts over. */
function StatefulSwitch(props: SwitchProps) {
  const [checked, setChecked] = useState(props.checked);
  return (
    <Switch
      {...props}
      checked={checked}
      onCheckedChange={(v) => {
        setChecked(v);
        props.onCheckedChange?.(v);
      }}
    />
  );
}

const meta = {
  title: 'UI/Switch',
  component: Switch,
  args: { checked: true, disabled: false, accessibilityLabel: 'Reminders' },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    onCheckedChange: { action: 'changed' },
  },
  render: (args) => <StatefulSwitch key={String(args.checked)} {...args} />,
} satisfies Meta<typeof Switch>;

export default meta;

// Typed from Meta, not `typeof meta`: the required callbacks come from the action argTypes,
// so stories needn't pass them.
type Story = StoryObj<Meta<typeof Switch>>;

/** On: accent track, the thumb on the right. */
export const On: Story = {};

/** Off. */
export const Off: Story = { args: { checked: false } };

/** Disabled on and off at 45 %. */
export const Disabled: Story = {
  render: (args) => (
    <View className="flex-row gap-6">
      <Switch {...args} checked disabled />
      <Switch {...args} checked={false} disabled />
    </View>
  ),
};

/** In a settings row next to its label; a long Lithuanian label wraps, the switch stays put. */
export const InRow: Story = {
  render: function InRow(args) {
    const { t } = useTranslation();
    return (
      <View className="gap-4">
        <View className="min-h-[56px] flex-row items-center gap-3 rounded-xl bg-surface px-4">
          <Text className="flex-1">{t('common.weeklyPhoto')}</Text>
          <StatefulSwitch {...args} accessibilityLabel={t('common.weeklyPhoto')} />
        </View>
        <View className="min-h-[56px] flex-row items-center gap-3 rounded-xl bg-surface px-4 py-3">
          <Text className="flex-1">
            Priminti apie savaitės nuotrauką sekmadienio vakarą, jei jos dar nepadarėte
          </Text>
          <StatefulSwitch {...args} checked={false} accessibilityLabel="Savaitės nuotrauka" />
        </View>
      </View>
    );
  },
};

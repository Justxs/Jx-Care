import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from './card';
import { icons } from './icon';
import { ListRow, type ListRowProps } from './list-row';
import { Separator } from './separator';

/** Keeps its own switch state so toggling works; changes still reach Actions. */
function Stateful(props: ListRowProps) {
  const [checked, setChecked] = useState(!!props.checked);
  return (
    <ListRow
      {...props}
      checked={checked}
      onCheckedChange={(next) => {
        setChecked(next);
        props.onCheckedChange?.(next);
      }}
    />
  );
}

const meta = {
  title: 'UI/ListRow',
  component: ListRow,
  args: {
    label: 'Time of day',
    icon: 'clock',
    value: '07:30',
    trailing: 'chevron',
    disabled: false,
  },
  argTypes: {
    label: { control: 'text' },
    detail: { control: 'text' },
    value: { control: 'text' },
    icon: { control: 'select', options: [undefined, ...Object.keys(icons)] },
    trailing: { control: 'radio', options: ['chevron', 'switch', 'value', 'none'] },
    checked: { control: 'boolean' },
    tone: { control: 'radio', options: [undefined, 'danger'] },
    disabled: { control: 'boolean' },
    onPress: { action: 'pressed' },
    onCheckedChange: { action: 'checked changed' },
  },
  // Rows live in a flush Card, divided by Separators.
  render: (args) => (
    <Card flush>
      <Stateful key={String(args.checked)} {...args} />
    </Card>
  ),
} satisfies Meta<typeof ListRow>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Pressable row: icon, label, value and a chevron. */
export const Chevron: Story = {};

/** A detail line under the label. */
export const WithDetail: Story = {
  args: {
    label: 'Reminders',
    detail: 'Morning 07:30 · Evening 21:00',
    icon: 'bell',
    value: undefined,
  },
};

/** A switch on the right; the row itself is not pressable. */
export const Switch: Story = {
  args: {
    label: 'Weekly photo',
    icon: 'camera',
    trailing: 'switch',
    value: undefined,
    checked: true,
  },
};

/** A read-only value with no chevron. */
export const Value: Story = {
  args: { label: 'Products', icon: 'package', trailing: 'value', value: '12' },
};

/** Danger tone, no trailing mark (Reset app). */
export const Danger: Story = {
  args: { label: 'Reset app', icon: 'trash-2', tone: 'danger', trailing: 'none', value: undefined },
};

export const Disabled: Story = { args: { disabled: true } };

/** A grouped list as Settings draws it; switch EN/LT in the toolbar. */
export const Group: Story = {
  render: function Group(args) {
    const { t } = useTranslation();
    return (
      <Card flush>
        <ListRow label={t('common.timeOfDay')} icon="clock" value="07:30" onPress={args.onPress} />
        <Separator inset />
        <Stateful label={t('common.weeklyPhoto')} icon="camera" trailing="switch" checked />
        <Separator inset />
        <ListRow label={t('common.skin')} trailing="value" value="12" />
        <Separator inset />
        <ListRow
          label={t('settings.resetApp')}
          icon="trash-2"
          tone="danger"
          trailing="none"
          onPress={args.onPress}
        />
      </Card>
    );
  },
};

/** A long Lithuanian label wraps; the value is cut at 45% of the row. */
export const LongLithuanian: Story = {
  args: {
    label: 'Priminimas apie savaitinę nuotrauką ir būklės įrašą',
    detail: 'Kiekvieną sekmadienį vakare, jei dar nepadarėte nuotraukos',
    value: 'Sekmadienis, 21:00 val.',
  },
};

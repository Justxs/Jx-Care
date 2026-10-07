import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView, View } from 'react-native';

import type { ColorToken } from '@/theme/colors';

import { Icon, icons, type IconName } from './icon';
import { Text } from './text';

const names = Object.keys(icons) as IconName[];

const tones: ColorToken[] = [
  'ink',
  'ink-muted',
  'accent',
  'danger',
  'warning',
  'skin',
  'hair',
  'brand-pink',
];

const meta = {
  title: 'UI/Icon',
  component: Icon,
  args: { name: 'package', size: 24, tone: 'ink', strokeWidth: 2, filled: false },
  argTypes: {
    name: { control: 'select', options: names },
    size: { control: 'select', options: [16, 18, 20, 24, 32] },
    tone: { control: 'select', options: tones },
    strokeWidth: { control: 'number' },
    filled: { control: 'boolean' },
    accessibilityLabel: { control: 'text' },
  },
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One icon; pick any name, size and tone in Controls. */
export const Single: Story = {};

/** Every icon name the app uses, with its name. Lucide, stroke 2, round caps. */
export const Gallery: Story = {
  render: (args) => (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <View className="flex-row flex-wrap">
        {names.map((name) => (
          <View key={name} className="w-1/4 items-center gap-1.5 px-1 py-3">
            <Icon name={name} size={24} tone={args.tone} />
            <Text numberOfLines={2} className="text-center text-tiny text-ink-muted">
              {name}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  ),
};

/** The sizes in use: 16 (chips), 18, 20 (rows, fields), 24 (tabs), 32 (empty states). */
export const Sizes: Story = {
  render: (args) => (
    <View className="flex-row items-end gap-4">
      {[16, 18, 20, 24, 32].map((size) => (
        <View key={size} className="items-center gap-1">
          <Icon name={args.name} size={size} tone={args.tone} />
          <Text className="text-tiny text-ink-muted">{size}</Text>
        </View>
      ))}
    </View>
  ),
};

/** Theme colour tokens; switch Light/Dark in the toolbar. */
export const Tones: Story = {
  render: (args) => (
    <View className="gap-2">
      {tones.map((tone) => (
        <View key={tone} className="flex-row items-center gap-3">
          <Icon name={args.name} size={24} tone={tone} />
          <Text className="text-body">{tone}</Text>
        </View>
      ))}
    </View>
  ),
};

/** `filled`: the shape takes its stroke colour (a picked star). */
export const Filled: Story = { args: { name: 'star', tone: 'accent', filled: true } };

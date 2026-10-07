import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView, View } from 'react-native';

import { Text } from './text';

/** DESIGN.md's type scale; each class sets size, line height and the Figtree weight. */
const typeScale = [
  { className: 'text-display', spec: '32 / 40 Bold' },
  { className: 'text-title-l', spec: '24 / 32 Bold' },
  { className: 'text-title-m', spec: '20 / 28 SemiBold' },
  { className: 'text-title-s', spec: '17 / 24 SemiBold' },
  { className: 'text-body-l', spec: '16 / 24 Regular' },
  { className: 'text-body', spec: '15 / 22 Regular' },
  { className: 'text-body-strong', spec: '15 / 22 SemiBold' },
  { className: 'text-label', spec: '13 / 18 Medium' },
  { className: 'text-caption', spec: '13 / 18 Regular' },
  { className: 'text-overline', spec: '13 / 18 SemiBold' },
  { className: 'text-tiny', spec: '12 / 16 Medium (tab labels, weekday letters)' },
  { className: 'text-tiny-strong', spec: '12 / 16 SemiBold (active tab label)' },
] as const;

const inks = [
  'text-ink',
  'text-ink-muted',
  'text-accent',
  'text-ok',
  'text-danger',
  'text-skin',
  'text-hair',
] as const;

const meta = {
  title: 'UI/Text',
  component: Text,
  args: { children: 'Vitamin C serum', className: 'text-body' },
  argTypes: {
    children: { control: 'text' },
    className: { control: 'select', options: typeScale.map((s) => s.className) },
    numberOfLines: { control: { type: 'number', min: 0, max: 5, step: 1 } },
  },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

/** `text-body text-ink`, the default. */
export const Body: Story = {};

/** Every step of the type scale with its size, line height and weight. */
export const TypeScale: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      {typeScale.map(({ className, spec }) => (
        <View key={className} className="gap-0.5">
          <Text className={className}>Ryto rutina · Morning routine</Text>
          <Text className="text-caption text-ink-muted">{`${className} · ${spec}`}</Text>
        </View>
      ))}
    </ScrollView>
  ),
};

/** The text colours on the canvas; check them in Dark too. */
export const Colours: Story = {
  render: () => (
    <View className="gap-2">
      {inks.map((ink) => (
        <Text key={ink} className={`text-body-strong ${ink}`}>
          {ink}
        </Text>
      ))}
    </View>
  ),
};

/** Tabular figures keep counts and times from jittering as they change. */
export const TabularNumbers: Story = {
  render: () => (
    <View className="gap-1">
      {['1/4', '11/14', '07:30', '21:45'].map((n) => (
        <Text key={n} className="text-title-m tabular-nums">
          {n}
        </Text>
      ))}
    </View>
  ),
};

/** Long Lithuanian text wraps instead of clipping. */
export const LongLithuanian: Story = {
  args: {
    children:
      'Drėkinamasis veido kremas jautriai ir sausai odai su hialurono rūgštimi ir niacinamidu',
  },
};

/** Cut to one line with an ellipsis, as in list rows. */
export const Truncated: Story = { args: { ...LongLithuanian.args, numberOfLines: 1 } };

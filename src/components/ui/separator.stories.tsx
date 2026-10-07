import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { ProductThumb } from './product-thumb';
import { Separator } from './separator';
import { Text } from './text';

const meta = {
  title: 'UI/Separator',
  component: Separator,
  args: { inset: false },
  argTypes: { inset: { control: 'boolean' } },
} satisfies Meta<typeof Separator>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A 1 px hairline, full width. */
export const FullWidth: Story = {};

/** Inset by a 48 pt thumb plus its gap. */
export const Inset: Story = { args: { inset: true } };

/** Between list rows: the inset line leaves the thumbnails unbroken. */
export const BetweenRows: Story = {
  render: () => (
    <View className="overflow-hidden rounded-xl bg-surface">
      {(['Cleanser', 'Vitamin C serum', 'Retinol serum'] as const).map((name, i) => (
        <View key={name}>
          {i > 0 ? <Separator inset /> : null}
          <View className="min-h-[64px] flex-row items-center gap-3 px-3">
            <ProductThumb category={i === 0 ? 'cleanser' : 'serum'} />
            <Text>{name}</Text>
          </View>
        </View>
      ))}
    </View>
  ),
};

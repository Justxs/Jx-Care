import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { DataErrorScreen } from './DataErrorScreen';

const meta = {
  title: 'Components/Shared/DataErrorScreen',
  component: DataErrorScreen,
  args: { kind: 'failed', detail: 'database is locked', onRetry: () => {} },
  argTypes: {
    kind: { control: 'select', options: ['failed', 'newer'] },
    detail: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <View className="h-[560px]">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof DataErrorScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The data couldn't be opened or an update couldn't change it; nothing was lost. Try again. */
export const Failed: Story = {};

/** The data comes from a newer Jx Care (a backup or a phone with a newer build): update the app. */
export const NewerData: Story = { args: { kind: 'newer' } };

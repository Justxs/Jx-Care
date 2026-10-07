import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo, seedEmpty } from '@/storybook/fixtures';
import { seedHairOverdue } from '@/storybook/seeds/hair';
import { withPendingData } from '@/storybook/seeds/pending';

import { HairListScreen } from './HairListScreen';

const meta = {
  title: 'Screens/Routines/Hair',
  parameters: { layout: 'fullscreen' },
  args: { initialSetupOpen: false },
  argTypes: { initialSetupOpen: { control: 'boolean' } },
  // The screen's props are optional as a whole (`= {}`), which Meta<typeof …> can't type.
  render: (args) => <HairListScreen {...args} />,
} satisfies Meta<{ initialSetupOpen?: boolean }>;

export default meta;

type Story = StoryObj<typeof meta>;

const demo = withAppData({ seed: seedDemo });

/** R1 Hair segment: Washes (due today) and Other care (trim), with the New task Fab. */
export const Demo: Story = { decorators: [demo] };

/** The wash two days overdue, in `warning`. */
export const Overdue: Story = { decorators: [withAppData({ seed: seedHairOverdue })] };

/** No hair tasks: the empty state with Set up, which opens the quick setup. */
export const Empty: Story = { decorators: [withAppData({ seed: seedEmpty })] };

/** Opened from Today's setup row: the quick setup sheet is already open. */
export const SetupOpen: Story = {
  args: { initialSetupOpen: true },
  decorators: [withAppData({ seed: seedEmpty })],
};

/** Skeleton rows while the list loads. */
export const Loading: Story = { decorators: [withPendingData(), demo] };

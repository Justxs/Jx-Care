import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo } from '@/storybook/fixtures';
import { seedProgressPrefs } from '@/storybook/seeds/settings';

import { ProgressPrefs } from './ProgressPrefs';

/** The progress photo card of S7 Preferences; changes save to the story database. */
const meta = {
  title: 'Components/Settings/ProgressPrefs',
  component: ProgressPrefs,
} satisfies Meta<typeof ProgressPrefs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Front only, the hair album off (its angles row keeps its space, faded out). */
export const Defaults: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** Front, left and right; the hair album on with front and top; a 50% guide. */
export const AlbumOn: Story = { decorators: [withAppData({ seed: seedProgressPrefs })] };

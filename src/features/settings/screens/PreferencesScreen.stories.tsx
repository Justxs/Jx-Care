import type { Meta, StoryObj } from '@storybook/react-native';

import { withAppData } from '@/storybook/appData';
import { seedDemo } from '@/storybook/fixtures';
import { seedProgressPrefs } from '@/storybook/seeds/settings';

import { PreferencesScreen } from './PreferencesScreen';

/**
 * S7 Preferences: language, currency and progress photos. Changing the language here switches the
 * app's strings, as in the app (the toolbar's EN/LT is set again on the next story).
 */
const meta = {
  title: 'Screens/Settings/Preferences',
  component: PreferencesScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PreferencesScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** EUR, front skin photos only, the hair album off. */
export const Defaults: Story = { decorators: [withAppData({ seed: seedDemo })] };

/** Side angles on, the hair album on with two angles, a 50% guide. */
export const ProgressPhotos: Story = { decorators: [withAppData({ seed: seedProgressPrefs })] };

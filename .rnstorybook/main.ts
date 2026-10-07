import type { StorybookConfig } from '@storybook/react-native';

/** On-device Storybook (docs/storybook.md). Stories live next to their component under src/. */
const main: StorybookConfig = {
  stories: ['../src/**/*.stories.?(ts|tsx)'],
  deviceAddons: ['@storybook/addon-ondevice-controls', '@storybook/addon-ondevice-actions'],
};

export default main;

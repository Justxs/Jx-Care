import type { Preview } from '@storybook/react-native';
import { action } from 'storybook/actions';

import { setStoryDbFactory } from '@/storybook/appData';
import { storyDecorators } from '@/storybook/decorators';
import { createExpoStoryDb } from '@/storybook/expoDb';
import { setNavigationLogger } from '@/storybook/router';

// Story databases are in-memory expo-sqlite; navigation shows up in the Actions panel.
setStoryDbFactory(createExpoStoryDb);
setNavigationLogger((name, args) => action(name)(...args));

const preview: Preview = {
  decorators: storyDecorators,
  parameters: {
    layout: 'padded',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;

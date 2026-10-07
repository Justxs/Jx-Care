import Storage from 'expo-sqlite/kv-store';

import { view } from './storybook.requires';

/** The on-device Storybook UI (app/storybook.tsx). Remembers the last story in expo-sqlite's kv-store. */
const StorybookUIRoot = view.getStorybookUI({
  storage: {
    getItem: (key) => Storage.getItem(key),
    setItem: (key, value) => Storage.setItem(key, value),
  },
});

export default StorybookUIRoot;

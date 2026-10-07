import { Redirect } from 'expo-router';

import StorybookUI from '../.rnstorybook';

/**
 * On-device Storybook at jxcare://storybook (docs/storybook.md). Only in a bundle started with
 * `npm run storybook`; otherwise metro swaps the import for an empty stub and this redirects home.
 */
export default function StorybookRoute() {
  if (process.env.EXPO_PUBLIC_STORYBOOK_ENABLED !== 'true') return <Redirect href="/" />;
  return <StorybookUI />;
}

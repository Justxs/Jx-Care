import { Redirect } from 'expo-router';

import { ThemePreviewScreen } from '@/theme/ThemePreviewScreen';

export default function ThemePreviewRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <ThemePreviewScreen />;
}

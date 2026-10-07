import '../../../global.css';
import '@/i18n';
import '../webInterop';

import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { Slot } from 'expo-router';

/**
 * Root of the website demo build (`pnpm web-demo`, see scripts/build-web-demo.mjs), which uses
 * src/web-demo/routes instead of app/. No PIN, no notifications, no stored data: just the fonts.
 */
export default function WebDemoLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  if (!fontsLoaded && fontError === null) return null;
  return <Slot />;
}

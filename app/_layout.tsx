import '../global.css';
import '@/i18n';

import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { View } from 'react-native';

import { MigrationGate } from '@/db/MigrationGate';
import { useThemeColors } from '@/theme/colors';

SplashScreen.preventAutoHideAsync().catch(() => {
  // The splash may already be hidden in fast refresh; nothing to do.
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  const colors = useThemeColors();
  const hideSplash = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Keep the splash up until the fonts load (no flash of the system font) and the database is
  // migrated.
  if (!fontsLoaded && fontError === null) return null;

  return (
    <View className="flex-1 bg-canvas font-sans">
      <StatusBar style={colors.scheme === 'dark' ? 'light' : 'dark'} />
      <MigrationGate onReady={hideSplash}>
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}
        />
      </MigrationGate>
    </View>
  );
}

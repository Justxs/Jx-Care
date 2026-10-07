import '../global.css';
import '@/i18n';

import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PortalHost } from '@rn-primitives/portal';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { ToastHost } from '@/components/ui/toast-host';
import { setDb } from '@/db';
import { appDb } from '@/db/client';
import { MigrationGate } from '@/db/MigrationGate';
import { queryClient } from '@/db/queryClient';
import { startDayClock } from '@/state/app';
import { bootstrapAfterMigrations } from '@/state/bootstrap';
import { watchScreenReader } from '@/state/ui';
import { useThemeColors } from '@/theme/colors';

setDb(appDb);

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
  const [booted, setBooted] = useState(false);

  useEffect(() => startDayClock(), []);
  useEffect(() => watchScreenReader(), []);

  const onMigrated = useCallback(() => {
    bootstrapAfterMigrations()
      .catch(() => {})
      .finally(() => {
        setBooted(true);
        SplashScreen.hideAsync().catch(() => {});
      });
  }, []);

  // Keep the splash up until the fonts load (no flash of the system font) and the database is
  // migrated.
  if (!fontsLoaded && fontError === null) return null;

  return (
    // GestureHandlerRootView takes no className; the View below carries the theme classes.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <View className="flex-1 bg-canvas font-sans">
              <StatusBar style={colors.scheme === 'dark' ? 'light' : 'dark'} />
              <MigrationGate onReady={onMigrated}>
                {booted ? (
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: colors.canvas },
                    }}
                  />
                ) : null}
              </MigrationGate>
              <ToastHost />
              <PortalHost />
            </View>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

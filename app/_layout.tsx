import '../global.css';
import '@/i18n';
// Register the routines and hair sources of product detail's "Used in" list before it opens.
import '@/features/hair/repo';
import '@/features/routines/repo';
// Registers Buy again (Products list, detail, archive, Today) with the shopping list.
import '@/features/shopping/api';
// Registers the routine player's conflict tags and lines.
import '@/features/conflicts/hooks';

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
import { Stack, ThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { ToastHost } from '@/components/ui/toast-host';
import { setDb } from '@/db';
import { appDb } from '@/db/client';
import { MigrationGate } from '@/db/MigrationGate';
import { ReminderAskHost } from '@/features/products/components/ReminderAskSheet';
import { queryClient } from '@/db/queryClient';
import { LockGate, SheetsAwayOnLock } from '@/features/security/components/LockGate';
import { PrivacyOverlay } from '@/features/security/components/PrivacyOverlay';
import { useFullScreenModalOptions, useStackOptions } from '@/navigation/stackOptions';
import { navigationTheme } from '@/navigation/theme';
// Also defines the background tasks, which must exist at module scope.
import { startAppNotifications } from '@/notifications/app';
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
  const stackOptions = useStackOptions();
  const fullScreen = useFullScreenModalOptions();
  const theme = useMemo(() => navigationTheme(colors), [colors]);
  const [booted, setBooted] = useState(false);
  // On-device Storybook (docs/storybook.md) gives each story its own toast and portal hosts.
  const storybookOpen = usePathname() === '/storybook';

  useEffect(() => startDayClock(), []);
  useEffect(() => watchScreenReader(), []);
  // Notifications start once the database is ready and the navigator is mounted (taps navigate).
  useEffect(() => (booted ? startAppNotifications() : undefined), [booted]);

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
          <View className="flex-1 bg-canvas font-sans">
            <StatusBar style={colors.scheme === 'dark' ? 'light' : 'dark'} />
            {/* The lock is a layer above everything here (L1, L2); unlocking reveals the same screen. */}
            <LockGate ready={booted}>
              <BottomSheetModalProvider>
                <MigrationGate onReady={onMigrated}>
                  {booted ? (
                    <ThemeProvider value={theme}>
                      <Stack screenOptions={stackOptions}>
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="(onboarding)" />
                        <Stack.Screen name="product-form" options={fullScreen} />
                        <Stack.Screen
                          name="player"
                          options={{ ...fullScreen, gestureEnabled: false }}
                        />
                        <Stack.Screen name="progress" options={fullScreen} />
                        <Stack.Screen name="storybook" options={{ gestureEnabled: false }} />
                        <Stack.Screen
                          name="hair/done/[taskId]"
                          options={{
                            presentation: 'transparentModal',
                            animation: 'none',
                            contentStyle: { backgroundColor: 'transparent' },
                          }}
                        />
                      </Stack>
                      {/* The in-context notification ask (task 021), over any screen. */}
                      <ReminderAskHost />
                    </ThemeProvider>
                  ) : null}
                </MigrationGate>
                <SheetsAwayOnLock ready={booted} />
                {storybookOpen ? null : <ToastHost />}
              </BottomSheetModalProvider>
              {/* After the provider's sheets: dialogs and menus opened from a sheet show above it. */}
              {storybookOpen ? null : <PortalHost />}
            </LockGate>
          </View>
          {/* Above sheets, dialogs and the lock: the app switcher never shows content. */}
          <PrivacyOverlay />
        </QueryClientProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

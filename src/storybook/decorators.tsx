import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PortalHost } from '@rn-primitives/portal';
import type { Decorator } from '@storybook/react-native';
import { useSelector } from '@tanstack/react-store';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components/ui/toast-host';
import { ToggleGroup } from '@/components/ui/toggle-group';
import { createQueryClient } from '@/db/queryClient';
import { cn } from '@/lib/cn';

// The same registrations app/_layout.tsx makes at start-up, so screens behave as in the app.
import './registrations';
import { applyStoryPrefs, setStoryLanguage, setStoryScheme, storyPrefsStore } from './preferences';
import { StoryRouteProvider } from './router';

/** `parameters.layout`: 'padded' (default, components) or 'fullscreen' (screens). */
export type StoryLayout = 'padded' | 'fullscreen';

let currentClient: QueryClient | null = null;

/** The query client of the story on screen (the smoke test checks it for failed queries). */
export function storyQueryClient(): QueryClient | null {
  return currentClient;
}

/** Light/Dark and EN/LT switches at the top of every story (developer tool, not translated). */
function StoryToolbar() {
  const scheme = useSelector(storyPrefsStore, (s) => s.scheme);
  const language = useSelector(storyPrefsStore, (s) => s.language);
  return (
    <View className="flex-row gap-2 border-b border-border bg-surface px-4 py-2">
      <ToggleGroup
        size="sm"
        className="flex-1"
        accessibilityLabel="Theme"
        items={[
          { value: 'light', label: 'Light', icon: 'sun' },
          { value: 'dark', label: 'Dark', icon: 'moon' },
        ]}
        value={scheme}
        onValueChange={(v) => setStoryScheme(v === 'dark' ? 'dark' : 'light')}
      />
      <ToggleGroup
        size="sm"
        className="flex-1"
        accessibilityLabel="Language"
        items={[
          { value: 'en', label: 'EN' },
          { value: 'lt', label: 'LT' },
        ]}
        value={language}
        onValueChange={(v) => void setStoryLanguage(v === 'lt' ? 'lt' : 'en')}
      />
    </View>
  );
}

/**
 * Everything app/_layout.tsx gives a screen, fresh for each story: gestures, safe area, its own
 * query client, bottom sheets, the portal host (menus, dialogs) and toasts, on the app's canvas.
 */
export function StoryShell({
  layout = 'padded',
  children,
}: {
  layout?: StoryLayout;
  children: ReactNode;
}) {
  // No garbage-collection timers: a story's cache lives exactly as long as the story.
  const [client] = useState(() => createQueryClient({ gcTime: Infinity }));
  useEffect(() => {
    currentClient = client;
    // A screen in an earlier story may have changed the theme or language (Settings does).
    void applyStoryPrefs();
  }, [client]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoryRouteProvider params={undefined}>
          <QueryClientProvider client={client}>
            <BottomSheetModalProvider>
              <View className="flex-1 bg-canvas font-sans">
                <StoryToolbar />
                <View className={cn('flex-1', layout === 'padded' && 'p-4')}>{children}</View>
                <ToastHost />
                <PortalHost />
              </View>
            </BottomSheetModalProvider>
          </QueryClientProvider>
        </StoryRouteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** The global decorator (.rnstorybook/preview.tsx and the Jest smoke test use it). */
export const withStoryShell: Decorator = (Story, context) => (
  <StoryShell
    // A new story gets a new shell: fresh query client, database and params.
    key={context.id}
    layout={(context.parameters.layout as StoryLayout | undefined) ?? 'padded'}
  >
    <Story />
  </StoryShell>
);

export const storyDecorators: Decorator[] = [withStoryShell];

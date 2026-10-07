import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState, type ComponentType } from 'react';
import { View } from 'react-native';

import { tabs, TabBar } from '@/components/TabBar';
import { CalendarScreen } from '@/features/calendar/screens/CalendarScreen';
import { ProductsScreen } from '@/features/products/screens/ProductsScreen';
import { RoutinesScreen } from '@/features/routines/screens/RoutinesScreen';
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen';
import { TodayScreen } from '@/features/today/screens/TodayScreen';
import { isLanguage } from '@/i18n';
import { appDay } from '@/lib/appDay';
import { AppData, setStoryDbFactory } from '@/storybook/appData';
import { StoryShell } from '@/storybook/decorators';
import { seedDemo } from '@/storybook/fixtures';
import { setStoryLanguage, setStoryScheme } from '@/storybook/preferences';
import { setNavigationLogger } from '@/storybook/router';

import { createSqlJsStoryDb } from './sqlJsDb';

/**
 * The live demo on the website (landing/): the real tab screens on the story data, in the browser.
 * The website frames this page inside its drawn phone and tells it the theme and language:
 * first through `?theme=dark&lang=lt`, then with `{ type: 'jx-care-demo', theme, lang }` messages.
 * Taps that would open another screen do nothing here; the tabs switch.
 */

setStoryDbFactory(createSqlJsStoryDb);
setNavigationLogger(() => {});

/** The visitor's own day, so the greeting, dates and streaks read as today. */
const demoDay = appDay(Date.now());

type TabName = (typeof tabs)[number]['name'];

const screens: Record<TabName, ComponentType> = {
  index: TodayScreen,
  products: ProductsScreen,
  routines: RoutinesScreen,
  calendar: CalendarScreen,
  settings: SettingsScreen,
};

type Prefs = { theme?: unknown; lang?: unknown };

function applyPrefs({ theme, lang }: Prefs): void {
  if (theme === 'light' || theme === 'dark') setStoryScheme(theme);
  if (isLanguage(lang)) void setStoryLanguage(lang);
}

// Before the first render, so the first frame already has the website's theme and language.
const query = new URLSearchParams(globalThis.location?.search ?? '');
applyPrefs({ theme: query.get('theme'), lang: query.get('lang') });

function tellParent(message: Record<string, unknown>): void {
  if (window.parent !== window) window.parent.postMessage(message, window.location.origin);
}

/** Lets the website fade the demo in over its drawing once real content is on screen. */
function ReadySignal() {
  useEffect(() => tellParent({ type: 'jx-care-demo:ready' }), []);
  return null;
}

function DemoTabs() {
  const [tab, setTab] = useState<TabName>('index');
  const Screen = screens[tab];
  const routes = tabs.map((t) => ({ key: t.name, name: t.name, params: undefined }));
  const tabBarProps = {
    state: { index: routes.findIndex((r) => r.name === tab), routes },
    navigation: {
      emit: () => ({ defaultPrevented: false }),
      navigate: (name: TabName) => setTab(name),
    },
  } as unknown as BottomTabBarProps;

  return (
    <View className="flex-1">
      <View className="flex-1">
        <Screen key={tab} />
      </View>
      <TabBar {...tabBarProps} />
    </View>
  );
}

export function WebDemo() {
  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: unknown } & Prefs;
      if (data?.type === 'jx-care-demo') applyPrefs(data);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <StoryShell layout="fullscreen" toolbar={false}>
      <AppData seed={seedDemo} today={demoDay}>
        <DemoTabs />
        <ReadySignal />
      </AppData>
    </StoryShell>
  );
}

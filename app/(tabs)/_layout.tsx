import { Redirect, Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { getDb } from '@/db';
import { useNeedsOnboarding } from '@/features/onboarding/gate';
import { useThemeColors } from '@/theme/colors';
import { motion } from '@/theme/motion';
import { useMotion } from '@/theme/useMotion';

const renderTabBar = (props: BottomTabBarProps) => <TabBar {...props} />;

export default function TabsLayout() {
  const colors = useThemeColors();
  const m = useMotion();
  // No settings row, or no PIN (checked at boot): onboarding first. O4 writes both.
  const onboarding = useNeedsOnboarding(getDb());
  if (onboarding) return <Redirect href="/welcome" />;
  // TODO(018): send to /lock while the lock store says locked.
  return (
    <Tabs
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        transitionSpec: {
          animation: 'timing',
          config: { duration: m.reduced ? motion.duration.reduced : motion.duration.fast },
        },
        sceneStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="products" />
      <Tabs.Screen name="routines" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

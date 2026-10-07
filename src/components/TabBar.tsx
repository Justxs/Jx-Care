import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { setToastInset } from '@/state/ui';

import { Icon, type IconName } from './ui/icon';
import { Text } from './ui/text';

export const tabs = [
  { name: 'index', label: 'tabs.today', icon: 'home' },
  { name: 'products', label: 'tabs.products', icon: 'package' },
  { name: 'routines', label: 'tabs.routines', icon: 'list-checks' },
  { name: 'calendar', label: 'tabs.calendar', icon: 'calendar' },
  { name: 'settings', label: 'tabs.settings', icon: 'sliders' },
] as const satisfies readonly { name: string; label: string; icon: IconName }[];

/** The five bottom tabs. Labels may wrap to two lines so Lithuanian never truncates. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      testID="tab-bar"
      onLayout={(e) => setToastInset(e.nativeEvent.layout.height)}
      className="flex-row border-t border-border bg-surface px-1 pt-1.5"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      {state.routes.map((route, index) => {
        const tab = tabs.find((x) => x.name === route.name);
        if (!tab) return null;
        const focused = state.index === index;
        const label = t(tab.label);
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: focused }}
            className="min-h-[52px] flex-1 items-center justify-start gap-0.5 pt-1 active:opacity-85"
          >
            <Icon name={tab.icon} size={24} tone={focused ? 'accent' : 'ink-muted'} />
            <Text
              numberOfLines={2}
              maxFontSizeMultiplier={1.3}
              className={cn(
                'text-center',
                focused ? 'text-tiny-strong text-accent' : 'text-tiny text-ink-muted',
              )}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

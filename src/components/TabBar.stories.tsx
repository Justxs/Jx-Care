import type { Meta, StoryObj } from '@storybook/react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { setToastInset, uiStore } from '@/state/ui';

import { TabBar, tabs } from './TabBar';

type TabName = (typeof tabs)[number]['name'];

type TabBarDemoProps = {
  /** The tab shown as selected at start. */
  initialTab: TabName;
  /** Logged when a tab is pressed (navigation is not followed in a story). */
  onTabPress: (name: string) => void;
};

/**
 * The real TabBar with a stand-in navigator: the five tab routes and a navigation object whose
 * `navigate` selects the tab here instead of switching screens.
 */
function TabBarDemo({ initialTab, onTabPress }: TabBarDemoProps) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(() => tabs.findIndex((tab) => tab.name === initialTab));
  // The bar lifts toasts above itself; give the inset back when the story closes.
  useEffect(() => {
    const base = uiStore.state.toastInset;
    return () => setToastInset(base);
  }, []);
  const routes = tabs.map((tab) => ({ key: `${tab.name}-key`, name: tab.name, params: undefined }));
  const props = {
    state: { index, routes, key: 'tabs', routeNames: routes.map((r) => r.name), type: 'tab' },
    navigation: {
      emit: () => ({ defaultPrevented: false }),
      navigate: (name: string) => {
        onTabPress(name);
        setIndex(routes.findIndex((r) => r.name === name));
      },
    },
    descriptors: {},
    insets,
  } as unknown as BottomTabBarProps;
  return (
    <View className="flex-1 justify-end">
      <View className="flex-1 items-center justify-center">
        <Text className="text-body text-ink-muted">{routes[index]?.name}</Text>
      </View>
      <TabBar {...props} />
    </View>
  );
}

const meta = {
  title: 'Components/Shared/TabBar',
  component: TabBarDemo,
  parameters: { layout: 'fullscreen' },
  args: {
    initialTab: 'index',
    // Callbacks come from the `action` argTypes (Actions panel); a value here would replace them.
    ...({} as Pick<TabBarDemoProps, 'onTabPress'>),
  },
  argTypes: {
    initialTab: { control: 'select', options: tabs.map((tab) => tab.name) },
    onTabPress: { action: 'tab pressed' },
  },
  // Keyed on the start tab so the Controls select resets the pressed one.
  render: (args) => <TabBarDemo key={args.initialTab} {...args} />,
} satisfies Meta<typeof TabBarDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Today selected (accent icon and bold label). Switch to LT in the toolbar: "Kalendorius" and
 * "Nustatymai" may wrap to two lines rather than truncate.
 */
export const Today: Story = {};

export const Products: Story = { args: { initialTab: 'products' } };

export const Settings: Story = { args: { initialTab: 'settings' } };

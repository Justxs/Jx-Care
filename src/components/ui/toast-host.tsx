import { useSelector } from '@tanstack/react-store';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { dismissToast, runToastAction, runToastSecondary, uiStore } from '@/state/ui';
import { motion } from '@/theme/motion';

import { Icon } from './icon';
import { Text } from './text';

/**
 * The one place toasts appear: floating above the tab bar (or the timer bar), never pushing the
 * layout. A new toast cross-fades over the old one. Use `showToast()` to show one.
 */
export function ToastHost() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const toast = useSelector(uiStore, (s) => s.toasts.at(-1));
  const inset = useSelector(uiStore, (s) => s.toastInset);
  const screenReaderOn = useSelector(uiStore, (s) => s.screenReaderOn);

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 px-4"
      style={{ bottom: (inset > 0 ? inset : insets.bottom) + 8 }}
    >
      {toast ? (
        <Animated.View
          key={toast.id}
          entering={FadeInDown.duration(motion.duration.base)}
          exiting={FadeOut.duration(motion.duration.base)}
          accessibilityLiveRegion="polite"
          className="min-h-[52px] flex-row items-center gap-2 rounded-md bg-surface pl-4 shadow-raised dark:border dark:border-border"
        >
          <Text className="flex-1 py-3 text-body">{toast.message}</Text>
          {toast.secondaryLabel && toast.onSecondary ? (
            <Pressable
              onPress={() => runToastSecondary(toast.id)}
              accessibilityRole="button"
              className="min-h-[44px] justify-center px-2 active:opacity-85"
            >
              <Text className="text-body-strong text-accent">{toast.secondaryLabel}</Text>
            </Pressable>
          ) : null}
          {toast.actionLabel && toast.onAction ? (
            <Pressable
              onPress={() => runToastAction(toast.id)}
              accessibilityRole="button"
              className="min-h-[44px] justify-center px-3 active:opacity-85"
            >
              <Text className="text-body-strong text-accent">{toast.actionLabel}</Text>
            </Pressable>
          ) : null}
          {/* With a screen reader the toast stays, so it needs a way to go. */}
          {screenReaderOn ? (
            <Pressable
              onPress={() => dismissToast(toast.id)}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.close')}
              className="h-[44px] w-[44px] items-center justify-center active:opacity-85"
            >
              <Icon name="x" size={20} tone="ink-muted" />
            </Pressable>
          ) : (
            <View className="w-1" />
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}

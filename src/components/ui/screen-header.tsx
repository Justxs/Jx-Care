import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

import { Icon } from './icon';
import { MoreMenu, type MoreMenuItem } from './more-menu';
import { Text } from './text';

/** One word action (spec refinement 12) or the overflow menu. */
export type ScreenHeaderAction =
  | {
      /** A word action in accent (Select, Share, Compare). Never Save. */
      text: string;
      onPress: () => void;
      disabled?: boolean;
    }
  | { menu: readonly MoreMenuItem[] };

export type ScreenHeaderProps = {
  title: string;
  /** Back arrow; with `close` an X for full-screen modals. */
  onBack?: () => void;
  close?: boolean;
  action?: ScreenHeaderAction;
};

/** 56 pt header: back or close, centred title, one optional action; the title never moves. */
export function ScreenHeader({ title, onBack, close, action }: ScreenHeaderProps) {
  const { t } = useTranslation();
  return (
    <View className="min-h-[56px] flex-row items-center gap-1 px-1">
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={close ? t('a11y.close') : t('a11y.back')}
          className="h-[44px] w-[44px] items-center justify-center rounded-full active:opacity-85"
        >
          <Icon name={close ? 'x' : 'arrow-left'} size={24} tone="ink" />
        </Pressable>
      ) : (
        <View className="w-[44px]" />
      )}
      <View className="flex-1 items-center py-1">
        <Text accessibilityRole="header" numberOfLines={2} className="text-center text-title-m">
          {title}
        </Text>
      </View>
      <HeaderAction action={action} />
    </View>
  );
}

function HeaderAction({ action }: { action?: ScreenHeaderAction }) {
  if (!action) return <View className="w-[44px]" />;
  if ('menu' in action) return <MoreMenu items={action.menu} />;
  return (
    <Pressable
      onPress={action.onPress}
      disabled={action.disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!action.disabled }}
      hitSlop={4}
      className={cn(
        'min-h-[44px] min-w-[44px] items-center justify-center px-2 active:opacity-85',
        action.disabled && 'opacity-45',
      )}
    >
      <Text className="text-body-strong text-accent">{action.text}</Text>
    </Pressable>
  );
}

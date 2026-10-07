import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

import { Icon, type IconName } from './icon';
import { MoreMenu, type MoreMenuItem } from './more-menu';
import { Text } from './text';

export type ScreenHeaderAction =
  | {
      /** A word action in accent (Select, Share, Compare). Never Save. */
      text: string;
      onPress: () => void;
      disabled?: boolean;
    }
  | {
      icon: IconName;
      label: string;
      onPress: () => void;
      /** Soft accent circle behind the icon. */
      primary?: boolean;
    }
  | { menu: readonly MoreMenuItem[] };

export type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Back arrow; with `close` an X for full-screen modals. */
  onBack?: () => void;
  close?: boolean;
  action?: ScreenHeaderAction;
};

const ICON_BUTTON = 'h-[44px] w-[44px] items-center justify-center rounded-full active:opacity-85';

/** 56 pt header: back or close, centred title, one optional action; the title never moves. */
export function ScreenHeader({ title, subtitle, onBack, close, action }: ScreenHeaderProps) {
  const { t } = useTranslation();
  return (
    <View className="min-h-[56px] flex-row items-center gap-1 px-1">
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={close ? t('a11y.close') : t('a11y.back')}
          className={ICON_BUTTON}
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
        {subtitle ? (
          <Text numberOfLines={1} className="text-center text-caption text-ink-muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <HeaderAction action={action} />
    </View>
  );
}

function HeaderAction({ action }: { action?: ScreenHeaderAction }) {
  if (!action) return <View className="w-[44px]" />;
  if ('menu' in action) return <MoreMenu items={action.menu} />;
  if ('text' in action) {
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
  return (
    <Pressable
      onPress={action.onPress}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      className={ICON_BUTTON}
    >
      <View
        className={cn(
          'h-[36px] w-[36px] items-center justify-center rounded-full',
          action.primary && 'bg-accent-soft',
        )}
      >
        <Icon name={action.icon} size={22} tone={action.primary ? 'accent' : 'ink'} />
      </View>
    </Pressable>
  );
}

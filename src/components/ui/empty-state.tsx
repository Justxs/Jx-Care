import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export type EmptyStateProps = {
  icon: IconName;
  title: string;
  /** One line of help. */
  children?: ReactNode;
  actionLabel?: string;
  actionIcon?: IconName;
  onAction?: () => void;
  /** Ghost second action. */
  secondaryLabel?: string;
  onSecondary?: () => void;
};

/** What an empty list shows, where its first rows would be; tall as three rows so nothing jumps. */
export function EmptyState({
  icon,
  title,
  children,
  actionLabel,
  actionIcon,
  onAction,
  secondaryLabel,
  onSecondary,
}: EmptyStateProps) {
  return (
    <View className="min-h-[168px] items-center justify-center gap-3 px-6 py-8">
      <Icon name={icon} size={32} tone="ink-muted" />
      <View className="items-center gap-1">
        <Text accessibilityRole="header" className="text-center text-title-s">
          {title}
        </Text>
        {typeof children === 'string' ? (
          <Text className="text-center text-body text-ink-muted">{children}</Text>
        ) : (
          children
        )}
      </View>
      {actionLabel && onAction ? (
        <Button block={false} icon={actionIcon} onPress={onAction} className="mt-1">
          {actionLabel}
        </Button>
      ) : null}
      {secondaryLabel && onSecondary ? (
        <Button block={false} variant="ghost" onPress={onSecondary}>
          {secondaryLabel}
        </Button>
      ) : null}
    </View>
  );
}

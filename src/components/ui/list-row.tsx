import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';

import { Icon, type IconName } from './icon';
import { Switch } from './switch';
import { Text } from './text';

export type ListRowProps = {
  label: string;
  detail?: string;
  /** Drawn bare in `ink-muted`; only when icons tell rows apart. */
  icon?: IconName;
  /** Right-hand text (with `trailing` `chevron` or `value`). */
  value?: string;
  trailing?: 'chevron' | 'switch' | 'value' | 'none';
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  tone?: 'danger';
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
};

/** One row of a grouped list, at least 56 pt. With a switch the row itself is not pressable. */
export function ListRow({
  label,
  detail,
  icon,
  value,
  trailing = 'chevron',
  checked = false,
  onCheckedChange,
  tone,
  onPress,
  disabled,
  className,
}: ListRowProps) {
  const danger = tone === 'danger';
  const content = (
    <>
      {icon ? <Icon name={icon} size={20} tone={danger ? 'danger' : 'ink-muted'} /> : null}
      <View className="flex-1 gap-0.5">
        <Text className={cn('text-body', danger && 'text-danger')}>{label}</Text>
        {detail ? <Text className="text-caption text-ink-muted">{detail}</Text> : null}
      </View>
      {value && trailing !== 'switch' ? (
        <Text numberOfLines={1} className="max-w-[45%] text-body text-ink-muted">
          {value}
        </Text>
      ) : null}
      {trailing === 'chevron' ? <Icon name="chevron-right" size={20} tone="ink-muted" /> : null}
    </>
  );
  const rowClass = cn('min-h-[56px] flex-row items-center gap-3 px-4 py-3', className);

  if (trailing === 'switch') {
    return (
      <View className={rowClass}>
        {content}
        <Switch
          checked={checked}
          onCheckedChange={(c) => onCheckedChange?.(c)}
          accessibilityLabel={label}
          disabled={disabled}
        />
      </View>
    );
  }
  if (!onPress) {
    return (
      <View
        accessible
        accessibilityLabel={value ? `${label}, ${value}` : label}
        className={rowClass}
      >
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={[label, detail, value].filter(Boolean).join(', ')}
      accessibilityState={{ disabled: !!disabled }}
      className={cn(rowClass, 'active:bg-accent-soft', disabled && 'opacity-45')}
    >
      {content}
    </Pressable>
  );
}

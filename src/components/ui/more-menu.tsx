import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { motion } from '@/theme/motion';

import { Icon, type IconName } from './icon';
import { Text } from './text';

export type MoreMenuItem = {
  label: string;
  icon?: IconName;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

export type MoreMenuProps = { items: readonly MoreMenuItem[] };

/** The header's overflow menu, spoken as "More actions". */
export function MoreMenu({ items }: MoreMenuProps) {
  const { t } = useTranslation();
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger
        accessibilityRole="button"
        accessibilityLabel={t('a11y.moreActions')}
        className="h-[44px] w-[44px] items-center justify-center rounded-full active:opacity-85"
      >
        <Icon name="ellipsis" size={24} tone="ink" />
      </DropdownMenuPrimitive.Trigger>
      <MenuPortal items={items} />
    </DropdownMenuPrimitive.Root>
  );
}

/** The menu panel of a DropdownMenu Root: also used by rows that open it on long press. */
export function MenuPortal({ items }: MoreMenuProps) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Overlay className="absolute inset-0">
        <DropdownMenuPrimitive.Content align="end" sideOffset={4} className="min-w-[220px]">
          <Animated.View
            entering={FadeIn.duration(motion.duration.fast)}
            exiting={FadeOut.duration(motion.duration.fast)}
            className="overflow-hidden rounded-md bg-surface py-1 shadow-raised dark:border dark:border-border"
          >
            {items.map((item) => (
              <DropdownMenuPrimitive.Item
                key={item.label}
                onPress={item.onPress}
                disabled={item.disabled}
                accessibilityRole="menuitem"
                accessibilityLabel={item.label}
                className={cn(
                  'min-h-[48px] flex-row items-center gap-3 px-4 active:bg-accent-soft',
                  item.disabled && 'opacity-45',
                )}
              >
                {item.icon ? (
                  <Icon
                    name={item.icon}
                    size={20}
                    tone={item.destructive ? 'danger' : 'ink-muted'}
                  />
                ) : (
                  <View className="w-0" />
                )}
                <Text className={cn('text-body', item.destructive && 'text-danger')}>
                  {item.label}
                </Text>
              </DropdownMenuPrimitive.Item>
            ))}
          </Animated.View>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Overlay>
    </DropdownMenuPrimitive.Portal>
  );
}

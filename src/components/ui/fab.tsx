import { Pressable } from 'react-native';

import { cn } from '@/lib/cn';

import { Icon, type IconName } from './icon';
import { Text } from './text';

/** Space at the end of a list so its last row scrolls clear of the Fab. */
export const FAB_LIST_END_SPACE = 96;

export type FabProps = {
  /** Verb first: "Add product". Always shown. */
  children: string;
  icon?: IconName;
  onPress: () => void;
  className?: string;
};

/** The one add action on a list screen: a labelled 56 pt pill, bottom right. */
export function Fab({ children, icon = 'plus', onPress, className }: FabProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={children}
      className={cn(
        'absolute bottom-4 right-4 h-[56px] flex-row items-center gap-2 rounded-full bg-accent pl-4 pr-5 shadow-raised active:opacity-85',
        className,
      )}
    >
      <Icon name={icon} size={22} tone="on-accent" />
      <Text className="text-body-strong text-on-accent">{children}</Text>
    </Pressable>
  );
}

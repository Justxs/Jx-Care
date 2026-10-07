import type { ReactNode } from 'react';
import { View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Height of the bar without the safe area: forms pad their scroll content by this much. */
export const BOTTOM_BAR_HEIGHT = 76;

export type BottomBarProps = {
  /** The full-width primary Button, optionally followed by one ghost Button. */
  children: ReactNode;
};

/** The pinned bar that holds a form's Save; it rides above the keyboard. */
export function BottomBar({ children }: BottomBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardStickyView offset={{ opened: insets.bottom }}>
      <View
        className="gap-2 border-t border-border bg-canvas px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        {children}
      </View>
    </KeyboardStickyView>
  );
}

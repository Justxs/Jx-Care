import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetBackgroundProps,
} from '@gorhom/bottom-sheet';
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { motion } from '@/theme/motion';
import { useMotion } from '@/theme/useMotion';

import { useCloseGuard } from './close-guard';
import { DiscardDialog } from './discard-dialog';
import { Text } from './text';

/** True inside a bottom sheet, so SheetFrame scrolls with the sheet's own scroll view. */
const InSheetContext = createContext(false);

/** True inside a bottom sheet: text fields then use the sheet's own input for keyboard handling. */
export function useInSheet(): boolean {
  return useContext(InSheetContext);
}

export type SheetFrameProps = {
  title: string;
  onCancel: () => void;
  cancelLabel?: string;
  /** Pinned under the scrolling body: usually one primary Button. */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Grabber, Cancel, centred title, scrolling body and a pinned footer. */
export function SheetFrame({
  title,
  onCancel,
  cancelLabel,
  footer,
  children,
  className,
}: SheetFrameProps) {
  const { t } = useTranslation();
  const inSheet = useContext(InSheetContext);
  const insets = useSafeAreaInsets();
  const Scroll = inSheet ? BottomSheetScrollView : KeyboardAwareScrollView;
  return (
    <View className={cn('bg-surface', inSheet ? 'max-h-full' : 'flex-1', className)}>
      <View className="items-center pt-2">
        <View className="h-[5px] w-[36px] rounded-full bg-border-strong" />
      </View>
      <View className="min-h-[52px] flex-row items-center px-2">
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          hitSlop={4}
          className="min-h-[44px] min-w-[72px] justify-center px-2 active:opacity-85"
        >
          <Text numberOfLines={1} className="text-body text-accent">
            {cancelLabel ?? t('common.cancel')}
          </Text>
        </Pressable>
        <Text
          accessibilityRole="header"
          numberOfLines={2}
          className="flex-1 text-center text-title-s"
        >
          {title}
        </Text>
        {/* Mirrors the Cancel button so the title stays centred. */}
        <View className="min-w-[72px]" />
      </View>
      <Scroll
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 16 }}
      >
        {children}
      </Scroll>
      {footer ? (
        <View
          className="border-t border-border bg-surface px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

function SheetBackground({ style }: BottomSheetBackgroundProps) {
  return <View style={style} className="rounded-t-xl bg-surface" />;
}

export type SheetProps = Omit<SheetFrameProps, 'onCancel'> & {
  open: boolean;
  /** Called once the sheet has closed (Cancel, backdrop, drag or after Discard). */
  onClose: () => void;
  /** Unsaved edits: closing asks "Discard changes?" and dragging down is off. */
  dirty?: boolean;
};

/** A bottom sheet opened in place, framed by SheetFrame. Settles with the critically damped spring. */
export function Sheet({ open, onClose, dirty = false, ...frame }: SheetProps) {
  const ref = useRef<BottomSheetModal>(null);
  const m = useMotion();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const dismiss = useCallback(() => ref.current?.dismiss(), []);
  const guard = useCloseGuard({ dirty, onClose: dismiss });

  useEffect(() => {
    if (open) ref.current?.present();
    else ref.current?.dismiss();
  }, [open]);

  const backdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.4}
        // Snap back to the open position, then ask: closing goes through the dirty guard.
        pressBehavior={0}
        onPress={guard.requestClose}
        accessible={false}
      />
    ),
    [guard.requestClose],
  );

  return (
    <>
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing
        maxDynamicContentSize={height - insets.top - 24}
        enablePanDownToClose={!dirty}
        animationConfigs={
          m.reduced
            ? { duration: motion.duration.reduced }
            : { ...motion.spring, overshootClamping: true }
        }
        backdropComponent={backdrop}
        handleComponent={null}
        backgroundComponent={SheetBackground}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onDismiss={onClose}
      >
        <BottomSheetView>
          <InSheetContext.Provider value>
            <SheetFrame {...frame} onCancel={guard.requestClose} />
          </InSheetContext.Provider>
        </BottomSheetView>
      </BottomSheetModal>
      <DiscardDialog
        open={guard.confirmOpen}
        onDiscard={guard.discard}
        onKeepEditing={guard.keepEditing}
      />
    </>
  );
}

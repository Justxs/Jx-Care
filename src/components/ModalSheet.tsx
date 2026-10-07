import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion, SlideInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { useCloseGuard } from '@/components/ui/close-guard';
import { DiscardDialog } from '@/components/ui/discard-dialog';
import { SheetFrame } from '@/components/ui/sheet';
import { motion } from '@/theme/motion';
import { useMotion } from '@/theme/useMotion';

export type ModalSheetProps = {
  title: string;
  footer?: ReactNode;
  dirty?: boolean;
  children: ReactNode;
};

/**
 * A sheet that is a route (presentation `transparentModal`), for sheets a notification opens
 * (Hair task done). Looks like the in-place Sheet; closing goes back.
 */
const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

export function ModalSheet({ title, footer, dirty = false, children }: ModalSheetProps) {
  const { t } = useTranslation();
  const guard = useCloseGuard({ dirty, onClose: close });
  const m = useMotion();
  return (
    <View className="flex-1 justify-end">
      <Animated.View
        entering={FadeIn.duration(motion.duration.base)}
        className="absolute inset-0 bg-ink/40"
      >
        <Pressable
          onPress={guard.requestClose}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.close')}
          className="flex-1"
        />
      </Animated.View>
      <Animated.View
        entering={
          m.allowMovement
            ? SlideInDown.duration(motion.duration.slow)
            : FadeIn.duration(motion.duration.reduced).reduceMotion(ReduceMotion.Never)
        }
        className="max-h-[90%] overflow-hidden rounded-t-xl bg-surface"
      >
        <SheetFrame
          title={title}
          onCancel={guard.requestClose}
          footer={footer}
          className="flex-initial"
        >
          {children}
        </SheetFrame>
      </Animated.View>
      <DiscardDialog
        open={guard.confirmOpen}
        onDiscard={guard.discard}
        onKeepEditing={guard.keepEditing}
      />
    </View>
  );
}

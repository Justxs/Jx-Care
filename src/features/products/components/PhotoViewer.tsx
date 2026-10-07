import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Modal, Pressable, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/ui/icon';
import { lockStore } from '@/state/lock';
import { cameraColors } from '@/theme/colors';
import { useMotion } from '@/theme/useMotion';

const MAX_SCALE = 4;

// Gesture builders are factories, not components: lowercase names keep the React lint rules quiet.
// The worklets plugin only spots callbacks on `Gesture.X()` chains, so every callback below says
// 'worklet' itself and runs on the UI thread.
const {
  Pinch: pinchGesture,
  Pan: panGesture,
  Tap: tapGesture,
  Race: race,
  Simultaneous: simultaneous,
} = Gesture;

export type PhotoViewerProps = {
  uri: string;
  open: boolean;
  onClose: () => void;
};

/**
 * The product photo full screen (P2), on the always-dark camera background: pinch to zoom up to
 * 4×, drag while zoomed, double tap to go back to the whole photo.
 */
export function PhotoViewer({ uri, open, onClose }: PhotoViewerProps) {
  const { t } = useTranslation();
  const m = useMotion();
  const { width } = useWindowDimensions();

  // A native modal sits above the lock screen, so it closes when the app locks.
  useEffect(() => {
    if (!open) return undefined;
    const sub = lockStore.subscribe((s) => {
      if (s.locked) onClose();
    });
    return () => sub.unsubscribe();
  }, [open, onClose]);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const resetTiming = m.timing('base');

  // Every opening starts with the whole photo.
  useEffect(() => {
    if (!open) return;
    for (const v of [x, y, savedX, savedY]) v.set(0);
    scale.set(1);
    savedScale.set(1);
  }, [open, scale, savedScale, x, y, savedX, savedY]);

  const pinch = pinchGesture()
    .onUpdate((e) => {
      'worklet';
      scale.set(Math.min(MAX_SCALE, Math.max(1, savedScale.value * e.scale)));
    })
    .onEnd(() => {
      'worklet';
      savedScale.set(scale.value);
      if (scale.value <= 1) {
        x.set(withTiming(0, resetTiming));
        y.set(withTiming(0, resetTiming));
        savedX.set(0);
        savedY.set(0);
      }
    });

  const pan = panGesture()
    .averageTouches(true)
    .onUpdate((e) => {
      'worklet';
      // The photo is a width × width square: it may move until its edge meets the screen edge.
      const limit = (width * (scale.value - 1)) / 2;
      x.set(Math.min(limit, Math.max(-limit, savedX.value + e.translationX)));
      y.set(Math.min(limit, Math.max(-limit, savedY.value + e.translationY)));
    })
    .onEnd(() => {
      'worklet';
      savedX.set(x.value);
      savedY.set(y.value);
    });

  const doubleTap = tapGesture()
    .numberOfTaps(2)
    .onEnd(() => {
      'worklet';
      scale.set(withTiming(1, resetTiming));
      x.set(withTiming(0, resetTiming));
      y.set(withTiming(0, resetTiming));
      savedScale.set(1);
      savedX.set(0);
      savedY.set(0);
    });

  const gesture = race(doubleTap, simultaneous(pinch, pan));

  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      statusBarTranslucent
      supportedOrientations={['portrait']}
      onRequestClose={onClose}
    >
      {/* A Modal is outside the app's gesture root, so it needs its own (it takes no className). */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1 bg-camera-bg" accessibilityViewIsModal>
          <GestureDetector gesture={gesture}>
            <View className="flex-1 items-center justify-center overflow-hidden">
              <Animated.View style={photoStyle}>
                <Image
                  source={{ uri }}
                  contentFit="contain"
                  accessibilityLabel={t('products.detail.photoViewer')}
                  style={{ width, height: width }}
                />
              </Animated.View>
            </View>
          </GestureDetector>
          <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0 px-1">
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.close')}
              className="h-[44px] w-[44px] items-center justify-center rounded-full active:opacity-85"
            >
              <Icon name="x" size={24} color={cameraColors.frame} />
            </Pressable>
          </SafeAreaView>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

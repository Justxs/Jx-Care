import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useMotion } from '@/theme/useMotion';

import { dragTarget, dropOffset, rowShift } from '../reorder';
import { StepRow, type StepRowData } from './StepRow';

/** Space under each row; part of the measured row height so the drag maths stays exact. */
const ROW_GAP = 8;
const LIFT_SCALE = 1.03;
/** Lowercase alias: the linter reads a capitalised call as a component. */
const { Pan: panGesture } = Gesture;

export type StepListProps = {
  steps: readonly StepRowData[];
  onPress: (index: number) => void;
  /** Keep it stable (useCallback): a new one mid-drag would cancel the drag. */
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  /** Off while a step is dragged, so the screen doesn't scroll under the finger. Keep it stable. */
  onDragActive?: (active: boolean) => void;
};

type DragState = {
  /** Index being dragged, or -1. */
  active: SharedValue<number>;
  /** Slot it currently hovers over. */
  target: SharedValue<number>;
  dy: SharedValue<number>;
  /** Row heights (gap included) in list order. */
  heights: SharedValue<number[]>;
};

/**
 * The editor's reorderable steps (R2). Drag the handle: the row lifts (scale 1.03, raised shadow)
 * and the others slide aside; with Reduce Motion the lift is a fade and the others jump. Swipe a
 * row left for Delete; it collapses before it goes.
 */
export function StepList({ steps, onPress, onMove, onRemove, onDragActive }: StepListProps) {
  const active = useSharedValue(-1);
  const target = useSharedValue(-1);
  const dy = useSharedValue(0);
  const heights = useSharedValue<number[]>([]);
  const drag = useMemo<DragState>(
    () => ({ active, target, dy, heights }),
    [active, target, dy, heights],
  );
  /** Measured row heights by step key. */
  const [measured] = useState(() => new Map<string, number>());
  const order = steps.map((s) => s.key).join(',');

  const syncHeights = useCallback(() => {
    const keys = order === '' ? [] : order.split(',');
    heights.set(keys.map((k) => measured.get(k) ?? 0));
  }, [order, measured, heights]);

  const reset = useCallback(() => {
    if (active.get() === -1) return;
    active.set(-1);
    target.set(-1);
    dy.set(0);
    onDragActive?.(false);
  }, [active, target, dy, onDragActive]);

  // The list changed (a drop reorders it): store the heights in the new order, and the rows drop
  // their drag offsets now that they render in their new places.
  useLayoutEffect(() => {
    syncHeights();
    reset();
  }, [syncHeights, reset]);

  const onHeight = useCallback(
    (key: string, h: number) => {
      measured.set(key, h);
      syncHeights();
    },
    [measured, syncHeights],
  );
  const onLift = useCallback(() => onDragActive?.(true), [onDragActive]);
  const onDrop = useCallback(
    (from: number, to: number) => {
      if (from === to) reset();
      else onMove(from, to);
    },
    [onMove, reset],
  );

  return (
    <View>
      {steps.map((step, index) => (
        <DraggableStep
          key={step.key}
          step={step}
          index={index}
          count={steps.length}
          drag={drag}
          onHeight={onHeight}
          onLift={onLift}
          onDrop={onDrop}
          onPress={() => onPress(index)}
          onMove={(to) => onMove(index, to)}
          onRemove={() => onRemove(index)}
        />
      ))}
    </View>
  );
}

function DraggableStep({
  step,
  index,
  count,
  drag,
  onHeight,
  onLift,
  onDrop,
  onPress,
  onMove,
  onRemove,
}: {
  step: StepRowData;
  index: number;
  count: number;
  drag: DragState;
  onHeight: (key: string, height: number) => void;
  onLift: () => void;
  onDrop: (from: number, to: number) => void;
  onPress: () => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const m = useMotion();
  const swipeable = useRef<SwipeableMethods>(null);
  const { active, target, dy, heights } = drag;
  const height = useSharedValue(0);
  const collapse = useSharedValue(1);
  const [removing, setRemoving] = useState(false);
  const slide = useMemo(() => m.timing('base'), [m]);
  const settle = useMemo(() => m.timing('fast'), [m]);
  const reduced = m.reduced;

  const onLayout = (e: LayoutChangeEvent) => {
    if (removing) return;
    const h = e.nativeEvent.layout.height;
    height.set(h);
    onHeight(step.key, h);
  };

  // Stable for the whole drag: a new gesture would cancel the one under the finger.
  const pan = useMemo(
    () =>
      panGesture()
        .minDistance(0)
        .onStart(() => {
          'worklet';
          active.set(index);
          target.set(index);
          dy.set(0);
          scheduleOnRN(onLift);
        })
        .onUpdate((e) => {
          'worklet';
          dy.set(e.translationY);
          target.set(dragTarget(heights.value, index, e.translationY));
        })
        .onEnd(() => {
          'worklet';
          const to = target.value;
          dy.set(
            withTiming(dropOffset(heights.value, index, to), settle, (finished) => {
              'worklet';
              if (finished) scheduleOnRN(onDrop, index, to);
            }),
          );
        }),
    [active, target, dy, heights, index, onLift, onDrop, settle],
  );

  const rowStyle = useAnimatedStyle(() => {
    const a = active.value;
    if (a === -1) return { transform: [{ translateY: 0 }, { scale: 1 }], opacity: 1, zIndex: 0 };
    if (a === index) {
      return {
        transform: [
          { translateY: dy.value },
          { scale: reduced ? 1 : withTiming(LIFT_SCALE, slide) },
        ],
        opacity: reduced ? withTiming(0.85, slide) : 1,
        zIndex: 10,
      };
    }
    const shift = rowShift(index, a, target.value, heights.value[a] ?? 0);
    return {
      transform: [{ translateY: reduced ? shift : withTiming(shift, slide) }, { scale: 1 }],
      opacity: 1,
      zIndex: 0,
    };
  });
  /** The raised shadow fades in under the lifted row (none under Reduce Motion). */
  const liftStyle = useAnimatedStyle(() => ({
    opacity: !reduced && active.value === index ? withTiming(1, slide) : 0,
  }));
  const collapseStyle = useAnimatedStyle(() =>
    collapse.value === 1
      ? {}
      : { height: height.value * collapse.value, opacity: collapse.value, overflow: 'hidden' },
  );

  const remove = () => {
    swipeable.current?.close();
    setRemoving(true);
    collapse.set(
      withTiming(0, m.timing('base', 'exit'), (finished) => {
        'worklet';
        if (finished) scheduleOnRN(onRemove);
      }),
    );
  };

  const handle = (
    <GestureDetector gesture={pan}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('routines.editor.reorder')}
        accessibilityActions={[
          ...(index > 0 ? [{ name: 'moveUp', label: t('routines.editor.moveUp') }] : []),
          ...(index < count - 1
            ? [{ name: 'moveDown', label: t('routines.editor.moveDown') }]
            : []),
        ]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'moveUp') onMove(index - 1);
          if (e.nativeEvent.actionName === 'moveDown') onMove(index + 1);
        }}
        testID={`step-handle-${index}`}
        className="min-h-[72px] w-[48px] items-center justify-center"
      >
        <Icon name="grip-vertical" size={20} tone="ink-muted" />
      </Pressable>
    </GestureDetector>
  );

  return (
    <Animated.View style={[rowStyle, collapseStyle]} onLayout={onLayout}>
      <View style={{ paddingBottom: ROW_GAP }}>
        <Animated.View
          pointerEvents="none"
          style={[liftStyle, { bottom: ROW_GAP }]}
          className="absolute left-0 right-0 top-0 rounded-xl bg-surface shadow-raised"
        />
        <ReanimatedSwipeable
          ref={swipeable}
          enabled={!removing}
          friction={2}
          rightThreshold={40}
          overshootRight={false}
          renderRightActions={() => <DeleteAction onPress={remove} />}
        >
          <StepRow
            step={step}
            index={index}
            count={count}
            handle={handle}
            onPress={onPress}
            onMove={onMove}
            onDelete={remove}
          />
        </ReanimatedSwipeable>
      </View>
    </Animated.View>
  );
}

function DeleteAction({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className="ml-2 w-[88px] items-center justify-center gap-1 rounded-xl bg-danger-soft px-1 active:opacity-85"
    >
      <Icon name="trash-2" size={20} tone="danger" />
      <Text numberOfLines={2} className="text-center text-label text-danger">
        {t('common.delete')}
      </Text>
    </Pressable>
  );
}

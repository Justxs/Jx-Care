import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { useTranslation } from 'react-i18next';

import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { ToggleGroup } from '@/components/ui/toggle-group';
import type { PhotoAngle, ProgressArea } from '@/db/enums';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/cn';
import {
  fourWeeksPair,
  initialPair,
  pickWeek,
  sharedAngles,
  stepShare,
  type ComparePair,
} from '@/lib/progressCompare';
import { cameraColors } from '@/theme/colors';
import { useMotion } from '@/theme/useMotion';

import { useTimeline, useWeekEntry } from '../api';
import type { TimelineTile } from '../types';

const MAX_SCALE = 4;
/** Space for the date labels above the photos. */
const LABEL_SPACE = 28;
const COLUMN_GAP = 8;
const HANDLE = 44;

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

type Side = keyof ComparePair;
type Mode = 'side' | 'slider';

const close = () => (router.canGoBack() ? router.back() : router.replace('/calendar/progress'));

/**
 * C7 Compare (`/progress/compare?area=skin`, optional `before` and `after` weeks): side by side
 * or a slider, Before and After pickers by date, "4 weeks ago vs now", an angle switcher and
 * pinch to zoom both photos in sync. Photos are named by their dates, never a week number.
 */
export function PhotoCompareScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ area?: string; before?: string; after?: string }>();
  const area: ProgressArea = params.area === 'hair' ? 'hair' : 'skin';
  const timeline = useTimeline(area);
  const tiles = useMemo(
    () => (timeline.data ?? []).filter((tile) => tile.status === 'taken' && tile.photo),
    [timeline.data],
  );
  const weeks = useMemo(() => tiles.map((tile) => tile.weekStart), [tiles]);
  const [chosen, setChosen] = useState<ComparePair | null>(null);
  const pair =
    chosen && weeks.includes(chosen.before) && weeks.includes(chosen.after)
      ? chosen
      : initialPair(weeks, { before: params.before, after: params.after });

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-canvas">
      <ScreenHeader title={t('screens.compare')} onBack={close} close />
      {timeline.data === undefined ? null : pair ? (
        <CompareBody area={area} pair={pair} tiles={tiles} onPair={setChosen} />
      ) : (
        <EmptyState icon="images" title={t('progress.compare.needTwoTitle')}>
          {t('progress.compare.needTwoBody')}
        </EmptyState>
      )}
    </SafeAreaView>
  );
}

type CompareBodyProps = {
  area: ProgressArea;
  pair: ComparePair;
  tiles: TimelineTile[];
  onPair: (pair: ComparePair) => void;
};

function CompareBody({ area, pair, tiles, onPair }: CompareBodyProps) {
  const { t } = useTranslation();
  const f = useFormat();
  const [mode, setMode] = useState<Mode>('side');
  const [angleChoice, setAngleChoice] = useState<PhotoAngle>('front');
  const [sheet, setSheet] = useState<{ side: Side; open: boolean } | null>(null);
  const [space, setSpace] = useState<{ width: number; height: number } | null>(null);
  const before = useWeekEntry(area, pair.before).data;
  const after = useWeekEntry(area, pair.after).data;

  const angles =
    before && after
      ? sharedAngles(
          before.photos.map((p) => p.angle),
          after.photos.map((p) => p.angle),
        )
      : [];
  const angle = angles.includes(angleChoice) ? angleChoice : angles[0];
  const beforeUri = angle ? before?.byAngle[angle]?.fileUri : undefined;
  const afterUri = angle ? after?.byAngle[angle]?.fileUri : undefined;

  const tileOf = (week: string) => tiles.find((tile) => tile.weekStart === week);
  const dateOf = (week: string) => {
    const day = tileOf(week)?.takenDay;
    return f.date(day ?? week);
  };
  const four = fourWeeksPair(tiles.map((tile) => tile.weekStart));
  const isFour = !!four && four.before === pair.before && four.after === pair.after;

  const onSpace = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSpace({ width, height });
  };

  const sides = {
    before: { uri: beforeUri, date: dateOf(pair.before), label: t('progress.compare.before') },
    after: { uri: afterUri, date: dateOf(pair.after), label: t('progress.compare.after') },
  };
  // A new pair, angle or mode starts with the whole photo again.
  const viewKey = `${mode}:${pair.before}:${pair.after}:${angle ?? '-'}`;

  return (
    <View className="flex-1">
      <View className="gap-3 px-4 pb-3">
        <ToggleGroup
          accessibilityLabel={t('progress.compare.modes')}
          items={[
            { value: 'side', label: t('progress.compare.sideBySide') },
            { value: 'slider', label: t('progress.compare.slider') },
          ]}
          value={mode}
          onValueChange={(v) => setMode(v === 'slider' ? 'slider' : 'side')}
        />
        <View className="flex-row gap-3">
          {(['before', 'after'] as const).map((side) => (
            <WeekPickerButton
              key={side}
              label={sides[side].label}
              date={sides[side].date}
              uri={tileOf(pair[side])?.photo?.fileUri}
              onPress={() => setSheet({ side, open: true })}
            />
          ))}
        </View>
        <View className="flex-row flex-wrap items-center gap-2">
          <Chip
            selected={isFour}
            disabled={!four}
            onPressedChange={() => {
              if (four) onPair(four);
            }}
          >
            {t('progress.compare.fourWeeks')}
          </Chip>
        </View>
        {angles.length > 1 && angle ? (
          <ToggleGroup
            size="sm"
            accessibilityLabel={t('progress.compare.angles')}
            items={angles.map((a) => ({ value: a, label: t(`progress.angles.${a}`) }))}
            value={angle}
            onValueChange={(v) => setAngleChoice(v as PhotoAngle)}
          />
        ) : null}
      </View>

      <View testID="compare-space" onLayout={onSpace} className="flex-1 items-center px-4">
        {before && after && angles.length === 0 ? (
          <Text className="pt-6 text-center text-body text-ink-muted">
            {t('progress.compare.noSharedAngle')}
          </Text>
        ) : space && beforeUri && afterUri ? (
          <CompareViewer
            key={viewKey}
            mode={mode}
            space={{ width: space.width - 32, height: space.height }}
            before={{ ...sides.before, uri: beforeUri }}
            after={{ ...sides.after, uri: afterUri }}
          />
        ) : null}
      </View>

      {sheet ? (
        <Sheet
          open={sheet.open}
          onClose={() => setSheet(null)}
          title={t(
            sheet.side === 'before' ? 'progress.compare.pickBefore' : 'progress.compare.pickAfter',
          )}
        >
          <View testID="compare-week-list" className="gap-1">
            {tiles.map((tile) => {
              const selected = pair[sheet.side] === tile.weekStart;
              const date = dateOf(tile.weekStart);
              return (
                <Pressable
                  key={tile.weekStart}
                  onPress={() => {
                    onPair(pickWeek(pair, sheet.side, tile.weekStart));
                    setSheet({ ...sheet, open: false });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={date}
                  accessibilityState={{ selected }}
                  className={cn(
                    'min-h-[72px] flex-row items-center gap-3 rounded-md px-2 py-2 active:bg-accent-soft',
                    selected && 'bg-accent-soft',
                  )}
                >
                  <View className="h-[64px] w-[48px] overflow-hidden rounded-sm bg-neutral-soft">
                    {tile.photo ? (
                      <Image
                        source={{ uri: tile.photo.fileUri }}
                        contentFit="cover"
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : null}
                  </View>
                  <Text className="flex-1 text-body">{date}</Text>
                  {selected ? <Icon name="check" size={20} tone="accent" /> : null}
                </Pressable>
              );
            })}
          </View>
        </Sheet>
      ) : null}
    </View>
  );
}

type PickerButtonProps = { label: string; date: string; uri?: string; onPress: () => void };

/** Before or After: the photo's thumbnail and its date; opens the list of dates. */
function WeekPickerButton({ label, date, uri, onPress }: PickerButtonProps) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('progress.compare.pickerLabel', { side: label, date })}
      className="min-h-[64px] flex-1 flex-row items-center gap-2 rounded-md border border-border-strong bg-surface p-2 active:opacity-85"
    >
      <View className="h-[48px] w-[36px] overflow-hidden rounded-sm bg-neutral-soft">
        {uri ? (
          <Image source={{ uri }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
        ) : null}
      </View>
      <View className="flex-1">
        <Text className="text-caption text-ink-muted">{label}</Text>
        <Text className="text-body-strong">{date}</Text>
      </View>
      <Icon name="chevron-down" size={18} tone="ink-muted" />
    </Pressable>
  );
}

// ─── Viewer ─────────────────────────────────────────────────────────────────

type ShownPhoto = { uri: string; date: string; label: string };

type ViewerProps = {
  mode: Mode;
  space: { width: number; height: number };
  before: ShownPhoto;
  after: ShownPhoto;
};

/** Both photos with one shared zoom: pinch zooms both, drag moves both, double tap resets. */
function CompareViewer({ mode, space, before, after }: ViewerProps) {
  const { t } = useTranslation();
  const [zoomed, setZoomed] = useState(false);
  const usable = Math.max(0, space.height - LABEL_SPACE - 24);
  const box =
    mode === 'side'
      ? (() => {
          const width = Math.min((space.width - COLUMN_GAP) / 2, (usable * 3) / 4);
          return { width, height: (width * 4) / 3 };
        })()
      : (() => {
          const width = Math.min(space.width, (usable * 3) / 4);
          return { width, height: (width * 4) / 3 };
        })();
  const zoom = useSyncedZoom(box, setZoomed);

  return (
    <View className="items-center gap-2">
      {mode === 'side' ? (
        <SideBySide before={before} after={after} box={box} zoom={zoom} />
      ) : (
        <Slider before={before} after={after} box={box} zoom={zoom} />
      )}
      <Text className="text-center text-caption text-ink-muted">
        {zoomed ? t('progress.compare.resetHint') : t('progress.compare.zoomHint')}
      </Text>
    </View>
  );
}

type Box = { width: number; height: number };
type Zoom = ReturnType<typeof useSyncedZoom>;

/** One zoom (scale and offset) shared by both photos, so they move together. */
function useSyncedZoom(box: Box, onZoomed: (zoomed: boolean) => void) {
  const m = useMotion();
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const resetTiming = m.timing('base');
  const { width, height } = box;

  const pinch = pinchGesture()
    .withTestId('compare-pinch')
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
      scheduleOnRN(onZoomed, scale.value > 1);
    });

  const move = (minPointers: number) =>
    panGesture()
      .minPointers(minPointers)
      .averageTouches(true)
      .onUpdate((e) => {
        'worklet';
        // Each photo may move until its edge meets its box.
        const limitX = (width * (scale.value - 1)) / 2;
        const limitY = (height * (scale.value - 1)) / 2;
        x.set(Math.min(limitX, Math.max(-limitX, savedX.value + e.translationX)));
        y.set(Math.min(limitY, Math.max(-limitY, savedY.value + e.translationY)));
      })
      .onEnd(() => {
        'worklet';
        savedX.set(x.value);
        savedY.set(y.value);
      });

  const doubleTap = tapGesture()
    .numberOfTaps(2)
    .withTestId('compare-double-tap')
    .onEnd(() => {
      'worklet';
      scale.set(withTiming(1, resetTiming));
      x.set(withTiming(0, resetTiming));
      y.set(withTiming(0, resetTiming));
      savedScale.set(1);
      savedX.set(0);
      savedY.set(0);
      scheduleOnRN(onZoomed, false);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return { pinch, move, doubleTap, style };
}

type PaneProps = { before: ShownPhoto; after: ShownPhoto; box: Box; zoom: Zoom };

/** Two 3:4 columns with their dates on top. */
function SideBySide({ before, after, box, zoom }: PaneProps) {
  const { t } = useTranslation();
  const gesture = race(zoom.doubleTap, simultaneous(zoom.pinch, zoom.move(1)));
  return (
    <GestureDetector gesture={gesture}>
      <View testID="compare-side-by-side" collapsable={false} className="flex-row gap-2">
        {(
          [
            ['before', before],
            ['after', after],
          ] as const
        ).map(([side, photo]) => (
          <View key={side} style={{ width: box.width }} className="gap-1">
            <Text numberOfLines={1} className="min-h-[24px] text-label">
              {photo.date}
            </Text>
            <View
              style={{ width: box.width, height: box.height }}
              className="overflow-hidden rounded-md bg-neutral-soft"
            >
              <Animated.View
                testID={`compare-zoom-${side}`}
                style={zoom.style}
                className="h-full w-full"
              >
                <Image
                  source={{ uri: photo.uri }}
                  contentFit="cover"
                  accessibilityLabel={t('progress.compare.imageLabel', {
                    side: photo.label,
                    date: photo.date,
                  })}
                  style={{ width: '100%', height: '100%' }}
                />
              </Animated.View>
            </View>
          </View>
        ))}
      </View>
    </GestureDetector>
  );
}

/**
 * One photo: the newer (After) revealed over the older (Before) by dragging a vertical handle.
 * Spoken "Comparison slider"; swipe up or down to show more or less of After.
 */
function Slider({ before, after, box, zoom }: PaneProps) {
  const { t } = useTranslation();
  // How much of the width After covers, from the right; the handle sits at 1 - reveal.
  const [reveal, setReveal] = useState(0.5);
  const handleAt = useSharedValue(1 - reveal);
  const { width } = box;

  const syncReveal = (at: number) => setReveal(Math.round((1 - at) * 100) / 100);
  const drag = panGesture()
    .maxPointers(1)
    .withTestId('compare-slider-drag')
    .onUpdate((e) => {
      'worklet';
      handleAt.set(Math.min(1, Math.max(0, e.x / width)));
    })
    .onEnd(() => {
      'worklet';
      scheduleOnRN(syncReveal, handleAt.value);
    });
  const gesture = race(zoom.doubleTap, simultaneous(zoom.pinch, zoom.move(2)), drag);

  const onAction = (e: AccessibilityActionEvent) => {
    const direction = e.nativeEvent.actionName === 'increment' ? 1 : -1;
    const next = stepShare(reveal, direction);
    setReveal(next);
    handleAt.set(1 - next);
  };

  const clip = useAnimatedStyle(() => ({ transform: [{ translateX: handleAt.value * width }] }));
  const unclip = useAnimatedStyle(() => ({ transform: [{ translateX: -handleAt.value * width }] }));
  const handle = useAnimatedStyle(() => ({
    transform: [{ translateX: handleAt.value * width - HANDLE / 2 }],
  }));

  return (
    <View style={{ width: box.width }} className="gap-1">
      <View className="min-h-[24px] flex-row justify-between gap-2">
        <Text numberOfLines={1} className="text-label">
          {before.date}
        </Text>
        <Text numberOfLines={1} className="text-label">
          {after.date}
        </Text>
      </View>
      <GestureDetector gesture={gesture}>
        <View
          testID="compare-slider"
          collapsable={false}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t('progress.compare.sliderLabel')}
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(reveal * 100),
            text: t('progress.compare.sliderValue', {
              percent: Math.round(reveal * 100),
              date: after.date,
            }),
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={onAction}
          style={{ width: box.width, height: box.height }}
          className="overflow-hidden rounded-md bg-neutral-soft"
        >
          <Animated.View
            testID="compare-zoom-before"
            style={zoom.style}
            className="absolute inset-0"
          >
            <Image
              source={{ uri: before.uri }}
              contentFit="cover"
              style={{ width: '100%', height: '100%' }}
            />
          </Animated.View>
          <Animated.View style={clip} className="absolute inset-0 overflow-hidden">
            <Animated.View style={unclip} className="absolute inset-0">
              <Animated.View
                testID="compare-zoom-after"
                style={zoom.style}
                className="absolute inset-0"
              >
                <Image
                  source={{ uri: after.uri }}
                  contentFit="cover"
                  style={{ width: '100%', height: '100%' }}
                />
              </Animated.View>
            </Animated.View>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[{ width: HANDLE }, handle]}
            className="absolute bottom-0 top-0 items-center justify-center"
          >
            {/* On top of a photo, so the handle uses the fixed camera colours in both themes. */}
            <View className="absolute bottom-0 top-0 w-[2px] bg-camera-ink" />
            <View className="h-[36px] w-[36px] flex-row items-center justify-center rounded-full border-2 border-camera-ink bg-camera-bg/60">
              <Icon name="chevron-left" size={16} color={cameraColors.ink} />
              <Icon name="chevron-right" size={16} color={cameraColors.ink} />
            </View>
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

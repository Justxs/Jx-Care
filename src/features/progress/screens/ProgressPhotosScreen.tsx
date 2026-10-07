import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup } from '@/components/ui/toggle-group';
import type { ProgressArea } from '@/db/enums';
import { useSettings } from '@/features/settings/api';
import { motion } from '@/theme/motion';

import { useThisWeekStatus, useTimeline } from '../api';
import { WeekTile } from '../components/WeekTile';
import type { TimelineTile } from '../types';

const SIDE = 16;
const GAP = 12;
/** Room at the end so the last row scrolls clear of the bottom edge. */
const END_SPACE = 96;

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/calendar'));

/** Width of one of the two tiles in a row. */
function useTileWidth(): number {
  const { width } = useWindowDimensions();
  return Math.floor((width - SIDE * 2 - GAP) / 2);
}

/**
 * C3 Progress photos (`/calendar/progress`, optional `?area=hair`): a pushed screen with one 3:4
 * tile per week, newest first, labelled with the date the photo was taken. Skin / Hair when the
 * hair album is on; "Take this week's photo" until it is taken; the header word Compare opens C7.
 */
export function ProgressPhotosScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ area?: string }>();
  const settings = useSettings().data;
  const hairAlbumOn = settings?.hairAlbumOn ?? false;
  const asked: ProgressArea | null =
    params.area === 'hair' || params.area === 'skin' ? params.area : null;
  const [chosen, setChosen] = useState<ProgressArea>(asked ?? 'skin');
  // Coming back with another album (after saving a hair photo) shows that album.
  const [lastAsked, setLastAsked] = useState(asked);
  if (asked !== lastAsked) {
    setLastAsked(asked);
    if (asked) setChosen(asked);
  }
  const area: ProgressArea = hairAlbumOn ? chosen : 'skin';

  const timeline = useTimeline(area);
  const status = useThisWeekStatus(area).data;
  // This week's empty tile is the "Take this week's photo" button instead.
  const tiles = useMemo(
    () => (timeline.data ?? []).filter((tile) => !(tile.current && tile.status === 'empty')),
    [timeline.data],
  );
  const hasPhotos = tiles.some((tile) => tile.status === 'taken');
  const tileWidth = useTileWidth();

  const takePhoto = () => router.push(`/progress/camera?area=${area}`);
  const openWeek = (tile: TimelineTile) => router.push(`/calendar/week/${area}/${tile.weekStart}`);

  const showTake = status !== undefined && status !== 'taken' && tiles.length > 0;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScreenHeader
        title={t('screens.progress')}
        onBack={goBack}
        action={
          hasPhotos
            ? {
                text: t('progress.photos.compare'),
                onPress: () => router.push(`/progress/compare?area=${area}`),
              }
            : undefined
        }
      />
      {hairAlbumOn ? (
        <View className="px-4 pb-3">
          <ToggleGroup
            accessibilityLabel={t('progress.photos.album')}
            items={[
              { value: 'skin', label: t('common.skin') },
              { value: 'hair', label: t('common.hair') },
            ]}
            value={area}
            onValueChange={(v) => setChosen(v === 'hair' ? 'hair' : 'skin')}
          />
        </View>
      ) : null}

      {timeline.data === undefined ? (
        <SkeletonGrid width={tileWidth} />
      ) : tiles.length === 0 ? (
        <Animated.View key={`empty-${area}`} entering={FadeIn.duration(motion.duration.fast)}>
          <EmptyState
            icon="images"
            title={t('progress.photos.emptyTitle')}
            actionLabel={t('progress.photos.emptyAction')}
            actionIcon="camera"
            onAction={takePhoto}
          >
            {t(area === 'hair' ? 'progress.photos.emptyBodyHair' : 'progress.photos.emptyBody')}
          </EmptyState>
        </Animated.View>
      ) : (
        <Animated.View
          key={`list-${area}`}
          entering={FadeIn.duration(motion.duration.fast)}
          className="flex-1"
        >
          <FlatList
            testID="progress-grid"
            data={tiles}
            keyExtractor={(tile) => tile.weekStart}
            numColumns={2}
            columnWrapperStyle={{ gap: GAP }}
            contentContainerStyle={{ paddingHorizontal: SIDE, gap: 16, paddingBottom: END_SPACE }}
            initialNumToRender={8}
            windowSize={7}
            ListHeaderComponent={
              showTake ? (
                <Button icon="camera" onPress={takePhoto} className="mb-1">
                  {t('progress.photos.takeThisWeek')}
                </Button>
              ) : null
            }
            renderItem={({ item }) => (
              <WeekTile area={area} tile={item} width={tileWidth} onOpen={openWeek} />
            )}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

/** Four tiles at their final size while the timeline loads. */
function SkeletonGrid({ width }: { width: number }) {
  const height = Math.round((width * 4) / 3);
  return (
    <View testID="progress-skeleton" className="flex-row flex-wrap gap-x-3 gap-y-4 px-4">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ width }} className="gap-1">
          <Skeleton width={width} height={height} />
          <Skeleton width={48} height={14} />
        </View>
      ))}
    </View>
  );
}

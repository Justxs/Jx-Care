import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  ScrollView,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Rating } from '@/components/ui/rating';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import type { ProgressArea } from '@/db/enums';
import type { ProgressPhoto } from '@/db/schema';
import { tagLabel } from '@/features/condition/labels';
import { useFormat } from '@/i18n/useFormat';
import { appDay, isValidDay, weekStart as weekOf } from '@/lib/appDay';
import { showToast } from '@/state/ui';

import { useDeletePhoto, useDeleteWeek, useWeekContext, useWeekEntry } from '../api';
import type { WeekEntry } from '../types';
import { weekContextLines } from '../weekLines';

const SIDE = 16;

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/calendar/progress'));

/**
 * C6 Week detail (`/calendar/week/[area]/[weekStart]`): titled by the date the photo was taken
 * ("Skin photo, 6 Oct"), never a week number. Every angle full width with paging, the rating,
 * tags and note, "What changed this week", and Compare with…, Retake and Delete.
 */
export function WeekDetailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ area?: string; weekStart?: string }>();
  const area: ProgressArea = params.area === 'hair' ? 'hair' : 'skin';
  const week =
    typeof params.weekStart === 'string' && isValidDay(params.weekStart)
      ? weekOf(params.weekStart)
      : null;

  if (!week) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
        <ScreenHeader title={t('screens.progress')} onBack={goBack} />
        <EmptyState icon="images" title={t('progress.week.goneTitle')}>
          {t('progress.week.goneBody')}
        </EmptyState>
      </SafeAreaView>
    );
  }
  return <WeekDetail area={area} weekStart={week} />;
}

type Confirm = { kind: 'week' } | { kind: 'photo'; photo: ProgressPhoto } | null;

function WeekDetail({ area, weekStart }: { area: ProgressArea; weekStart: string }) {
  const { t } = useTranslation();
  const f = useFormat();
  const entryQuery = useWeekEntry(area, weekStart);
  const entry = entryQuery.data;
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const deletePhoto = useDeletePhoto();
  const deleteWeek = useDeleteWeek();

  const photos = entry?.photos ?? [];
  const current = photos[Math.min(page, photos.length - 1)] ?? null;
  const date = entry?.takenAt != null ? f.date(appDay(entry.takenAt)) : null;
  const title = date
    ? t(area === 'hair' ? 'progress.review.titleHair' : 'progress.review.titleSkin', { date })
    : t('screens.progress');

  if (entryQuery.isPending) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
        <ScreenHeader title="" onBack={goBack} />
      </SafeAreaView>
    );
  }

  if (!entry || photos.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
        <ScreenHeader title={t('screens.progress')} onBack={goBack} />
        <EmptyState icon="images" title={t('progress.week.goneTitle')}>
          {t('progress.week.goneBody')}
        </EmptyState>
      </SafeAreaView>
    );
  }

  const failed = () => showToast({ message: t('progress.week.deleteFailed') });
  const onDelete = () => {
    const target = confirm;
    setConfirm(null);
    if (!target) return;
    if (target.kind === 'week') {
      deleteWeek.mutate(entry.id, { onSuccess: goBack, onError: failed });
      return;
    }
    deletePhoto.mutate(target.photo.id, {
      onSuccess: (result) => {
        if (result?.entryDeleted) goBack();
        else setPage((p) => Math.max(0, Math.min(p, photos.length - 2)));
      },
      onError: failed,
    });
  };

  const angleName = (photo: ProgressPhoto) => t(`progress.angles.${photo.angle}`);
  const shownDate = date ?? f.date(weekStart);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScreenHeader
        title={title}
        onBack={goBack}
        action={{
          menu: [
            ...(photos.length > 1 && current
              ? [
                  {
                    label: t('progress.week.deletePhoto'),
                    icon: 'trash-2' as const,
                    destructive: true,
                    onPress: () => setConfirm({ kind: 'photo', photo: current }),
                  },
                ]
              : []),
            {
              label: t('progress.week.deleteWeek'),
              icon: 'trash-2' as const,
              destructive: true,
              onPress: () => setConfirm({ kind: 'week' }),
            },
          ],
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 24 }}>
        <PhotoPager
          entry={entry}
          date={shownDate}
          page={page}
          onPage={setPage}
          angleName={angleName}
        />

        <View className="gap-6 px-4">
          <CheckInCard area={area} entry={entry} />
          <WhatChanged area={area} weekStart={weekStart} />
          <View className="flex-row gap-3">
            <Button
              variant="secondary"
              icon="columns-2"
              className="flex-1"
              onPress={() => router.push(`/progress/compare?area=${area}&after=${weekStart}`)}
            >
              {t('progress.week.compareWith')}
            </Button>
            <Button
              variant="secondary"
              icon="camera"
              className="flex-1"
              onPress={() => router.push(`/progress/camera?area=${area}&week=${weekStart}`)}
            >
              {t('progress.week.retake')}
            </Button>
          </View>
        </View>
      </ScrollView>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={
          confirm?.kind === 'photo'
            ? t('progress.week.deletePhotoTitle', {
                angle: angleName(confirm.photo),
                date: shownDate,
              })
            : t('progress.week.deleteWeekTitle', { date: shownDate })
        }
        description={t('progress.week.deleteBody')}
        actionLabel={t('progress.week.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onAction={onDelete}
        onCancel={() => setConfirm(null)}
      />
    </SafeAreaView>
  );
}

type PhotoPagerProps = {
  entry: WeekEntry;
  date: string;
  page: number;
  onPage: (page: number) => void;
  angleName: (photo: ProgressPhoto) => string;
};

/** Every angle full width, swiped sideways, each 3:4 with its angle under it. */
function PhotoPager({ entry, date, page, onPage, angleName }: PhotoPagerProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const photoWidth = width - SIDE * 2;
  const count = entry.photos.length;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    onPage(Math.max(0, Math.min(count - 1, next)));
  };

  return (
    <FlatList
      testID="week-pager"
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      data={entry.photos}
      keyExtractor={(photo) => String(photo.id)}
      onMomentumScrollEnd={onScrollEnd}
      getItemLayout={(_data, index) => ({ length: width, offset: width * index, index })}
      renderItem={({ item, index }) => {
        const angle = angleName(item);
        return (
          <View style={{ width }} className="gap-2 px-4">
            <View
              style={{ width: photoWidth, aspectRatio: 3 / 4 }}
              className="overflow-hidden rounded-md bg-neutral-soft"
            >
              <Image
                source={{ uri: item.fileUri }}
                contentFit="cover"
                transition={200}
                accessibilityLabel={t('progress.week.photoLabel', { angle, date })}
                style={{ width: '100%', height: '100%' }}
              />
            </View>
            <Text className="text-label text-ink-muted">
              {count > 1 ? t('progress.week.page', { angle, index: index + 1, count }) : angle}
            </Text>
          </View>
        );
      }}
      extraData={page}
    />
  );
}

/** The week's rating, tags and note from the review (C5). */
function CheckInCard({ area, entry }: { area: ProgressArea; entry: WeekEntry }) {
  const { t } = useTranslation();
  return (
    <Card>
      <View className="gap-4">
        <View className="gap-1.5">
          <Text className="text-label">{t('progress.week.rating')}</Text>
          {entry.rating ? (
            <Rating value={entry.rating} accessibilityLabel={t('progress.week.rating')} />
          ) : (
            <Text className="text-body text-ink-muted">{t('progress.week.notRated')}</Text>
          )}
        </View>
        {entry.tags.length > 0 ? (
          <View className="gap-1.5">
            <Text className="text-label">{t('progress.week.tags')}</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {entry.tags.map((tag) => (
                <View
                  key={tag}
                  className="min-h-[24px] justify-center rounded-full bg-accent-soft px-2"
                >
                  <Text className="text-label text-accent">{tagLabel(t, area, tag)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        {entry.note ? (
          <View className="gap-1.5">
            <Text className="text-label">{t('progress.week.note')}</Text>
            <Text className="text-body">{entry.note}</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

/** "What changed this week": routines, products started and finished, condition summary. */
function WhatChanged({ area, weekStart }: { area: ProgressArea; weekStart: string }) {
  const { t } = useTranslation();
  const ctx = useWeekContext(area, weekStart).data;
  const lines = ctx ? weekContextLines(t, area, ctx) : null;
  return (
    <Card title={t('progress.week.changed')} flush>
      {lines === null ? (
        <View className="min-h-[56px]" />
      ) : lines.length === 0 ? (
        <View className="min-h-[56px] justify-center px-4 py-3">
          <Text className="text-body text-ink-muted">{t('progress.week.nothing')}</Text>
        </View>
      ) : (
        lines.map((line, i) => (
          <View key={`${i}-${line}`}>
            {i > 0 ? <Separator className="ml-4" /> : null}
            <View className="min-h-[48px] justify-center px-4 py-3">
              <Text className="text-body">{line}</Text>
            </View>
          </View>
        ))
      )}
    </Card>
  );
}

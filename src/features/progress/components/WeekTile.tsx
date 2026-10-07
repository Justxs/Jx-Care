import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PhotoTile } from '@/components/ui/photo-tile';
import { Text } from '@/components/ui/text';
import type { ProgressArea } from '@/db/enums';
import { useFormat } from '@/i18n/useFormat';
import { addDays } from '@/lib/appDay';

import type { TimelineTile } from '../types';

export type WeekTileProps = {
  area: ProgressArea;
  tile: TimelineTile;
  width: number;
  onOpen: (tile: TimelineTile) => void;
};

/**
 * One week on Progress photos (C3): the cover photo labelled with the date it was taken ("6 Oct"),
 * never a week number and never stars; a missing week is a dashed "No photo" tile with "Skipped".
 * The 3:4 box is reserved before the image decodes, so the grid never reflows.
 */
export function WeekTile({ area, tile, width, onOpen }: WeekTileProps) {
  const { t } = useTranslation();
  const f = useFormat();

  if (tile.status === 'taken' && tile.photo && tile.takenDay) {
    const date = f.date(tile.takenDay);
    return (
      <View style={{ width }}>
        <PhotoTile
          src={tile.photo.fileUri}
          date={date}
          accessibilityLabel={t(
            area === 'hair' ? 'progress.review.titleHair' : 'progress.review.titleSkin',
            { date },
          )}
          onPress={() => onOpen(tile)}
        />
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={t('progress.photos.missingLabel', {
        from: f.date(tile.weekStart),
        to: f.date(addDays(tile.weekStart, 6)),
      })}
      testID={`missing-${tile.weekStart}`}
      style={{ width }}
      className="gap-1"
    >
      <View
        style={{ aspectRatio: 3 / 4 }}
        className="w-full items-center justify-center rounded-md border-2 border-dashed border-border-strong px-2"
      >
        <Text className="text-center text-label text-ink-muted">
          {t('progress.photos.noPhoto')}
        </Text>
      </View>
      <Text className="text-caption text-ink-muted">{t('progress.photos.skipped')}</Text>
    </View>
  );
}

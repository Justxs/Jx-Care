import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { useThisWeekStatus, useTimeline } from '@/features/progress/api';
import { useSettings } from '@/features/settings/api';
import { isoWeekdayOf } from '@/i18n/format';
import { useFormat } from '@/i18n/useFormat';
import { nextPhotoDay } from '@/lib/weeklyPhoto';

/**
 * The row under the grid that opens C3 (Progress photos), with "Last photo 29 Sep · next one
 * Sunday": the date of the newest skin photo and, while Weekly photo is on, when the next is due.
 */
export function ProgressPhotosRow() {
  const { t } = useTranslation();
  const f = useFormat();
  const settings = useSettings().data;
  const timeline = useTimeline('skin').data;
  const status = useThisWeekStatus('skin').data;

  const lastDay = timeline?.find((tile) => tile.status === 'taken')?.takenDay ?? null;
  let next: string | null = null;
  if (settings?.weeklyPhotoOn && status) {
    const day = nextPhotoDay(f.today, settings.weeklyPhotoWeekday, status !== 'due');
    next =
      day === f.today ? t('progress.calendarRow.today') : t(`weekdays.long.${isoWeekdayOf(day)}`);
  }
  let detail: string | undefined;
  if (timeline) {
    if (lastDay && next) {
      detail = t('progress.calendarRow.lastNext', { date: f.date(lastDay), day: next });
    } else if (lastDay) {
      detail = t('progress.calendarRow.last', { date: f.date(lastDay) });
    } else if (next) {
      detail = t('progress.calendarRow.next', { day: next });
    } else {
      detail = t('progress.calendarRow.none');
    }
  }

  return (
    <Card flush>
      <ListRow
        icon="images"
        label={t('calendar.progressRow')}
        detail={detail}
        onPress={() => router.push('/calendar/progress')}
      />
    </Card>
  );
}

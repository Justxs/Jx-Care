import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useSettings, useUpdateSettings } from '@/features/settings/api';
import { useFormat } from '@/i18n/useFormat';
import { askForReminders } from '@/notifications';
import { showToast } from '@/state/ui';

/**
 * The "Weekly progress photo" row in Today's Optional group (T1 first run): turns Weekly photo on,
 * asking for notifications in context first (task 021's ask), or opens Reminders once it is on to
 * change the day and time.
 */
export function useWeeklyPhotoOptional() {
  const { t } = useTranslation();
  const f = useFormat();
  const settings = useSettings().data;
  const update = useUpdateSettings();
  const on = !!settings?.weeklyPhotoOn;
  const when = settings
    ? {
        days: t(`today.weekdaysPlural.${settings.weeklyPhotoWeekday}`),
        time: f.time(settings.weeklyPhotoTime),
      }
    : null;

  const press = async () => {
    if (on) {
      router.push('/settings/reminders');
      return;
    }
    const outcome = await askForReminders({ reason: 'weeklyPhoto' });
    // The choice is kept either way (S5: nothing is sent until notifications are on).
    await update.mutateAsync({ weeklyPhotoOn: true });
    // Denied: the ask already showed "Notifications are off in phone settings".
    if (outcome === 'denied') return;
    showToast({
      message: t('progress.optional.onToast', when ?? { days: '', time: '' }),
      actionLabel: t('common.undo'),
      onAction: () => update.mutate({ weeklyPhotoOn: false }),
    });
  };

  return {
    on,
    /** "On · Sundays at 10:00" once it is on; the row's own hint before. */
    detail: on && when ? t('progress.optional.on', when) : undefined,
    press: () => void press().catch(() => {}),
  };
}

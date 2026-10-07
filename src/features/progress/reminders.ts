/**
 * The weekly photo reminder (spec: Notifications, Weekly photo; task 036). Imported by
 * `src/notifications/tasks.ts`, so the planner and the "Skip this week" button exist in a headless
 * start too.
 */
import type { TFunction } from 'i18next';

import type { Db } from '@/db';
import type { ProgressArea } from '@/db/enums';
import { queryClient } from '@/db/queryClient';
import { qk } from '@/db/queryKeys';
import type { AppSettings } from '@/features/settings/repo';
import { appDay, momentOf, weekStart } from '@/lib/appDay';
import { photoDays } from '@/lib/weeklyPhoto';
import {
  notificationKey,
  registerAction,
  registerPlanner,
  type ActionHandler,
  type PlannedNotification,
  type Planner,
} from '@/notifications';

import { skipWeek, thisWeekStatus } from './repo';

/** Weeks planned ahead; the scheduler keeps only the next 14 days of them. */
const WEEKS_AHEAD = 3;

/** The albums whose photo for the week of `day` is still due (skin, then hair when it is on). */
export function dueAreas(db: Db, settings: AppSettings, day: string): ProgressArea[] {
  const areas: ProgressArea[] = settings.hairAlbumOn ? ['skin', 'hair'] : ['skin'];
  return areas.filter((area) => thisWeekStatus(db, area, day) === 'due');
}

/** "Time for this week's skin photo", or the skin and hair (or hair only) version. */
export function reminderText(t: TFunction, areas: readonly ProgressArea[]): string {
  if (areas.includes('skin') && areas.includes('hair')) return t('progress.reminder.skinAndHair');
  return areas[0] === 'hair' ? t('progress.reminder.hair') : t('progress.reminder.skin');
}

/**
 * One notification on the chosen weekday and time of each week, while Weekly photo is on. None for
 * a week already taken or skipped, and none for a day already past: a missed week isn't nagged.
 */
export const planWeeklyPhoto: Planner = ({ db, now, settings, t }) => {
  if (!settings.weeklyPhotoOn) return [];
  const out: PlannedNotification[] = [];
  for (const day of photoDays(appDay(now), settings.weeklyPhotoWeekday, WEEKS_AHEAD)) {
    const fireAt = momentOf(day, settings.weeklyPhotoTime);
    if (fireAt <= now) continue;
    const areas = dueAreas(db, settings, day);
    const first = areas[0];
    if (!first) continue;
    out.push({
      key: notificationKey('weekly_photo', null, 'weekly_photo', weekStart(day)),
      entityType: 'weekly_photo',
      entityId: null,
      kind: 'weekly_photo',
      fireAt,
      title: t('common.weeklyPhoto'),
      body: reminderText(t, areas),
      categoryId: 'weekly_photo',
      channelId: 'photos',
      data: { url: `/progress/camera?area=${first}` },
    });
  }
  return out;
};

/** "Skip this week" on the notification: skips every album still due this week. */
export const skipWeekAction: ActionHandler = ({ db, settings, now }) => {
  const today = appDay(now);
  for (const area of dueAreas(db, settings, today)) skipWeek(db, area, weekStart(today));
  queryClient.invalidateQueries({ queryKey: qk.progress.all }).catch(() => {});
  queryClient.invalidateQueries({ queryKey: ['today'] }).catch(() => {});
};

registerPlanner('weekly_photo', planWeeklyPhoto);
registerAction('weekly_photo', 'skip_week', skipWeekAction);

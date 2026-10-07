/**
 * Runs once at start-up and again when the language changes: Android channels, categories with
 * their action buttons, and how notifications show while the app is open.
 */
import * as Notifications from 'expo-notifications';
import type { TFunction } from 'i18next';
import { Platform } from 'react-native';

import { palette } from '@/theme/colors';

import type { ActionId, CategoryId, ChannelId } from './types';

type ChannelDef = { id: ChannelId; name: string; importance: Notifications.AndroidImportance };

/** Android channels, names in the app's language. */
export function channelDefs(t: TFunction): ChannelDef[] {
  const high = Notifications.AndroidImportance.HIGH;
  return [
    { id: 'expiry', name: t('notifications.channels.expiry'), importance: high },
    { id: 'routines', name: t('notifications.channels.routines'), importance: high },
    { id: 'hair', name: t('notifications.channels.hair'), importance: high },
    { id: 'photos', name: t('notifications.channels.photos'), importance: high },
    {
      id: 'digest',
      name: t('notifications.channels.digest'),
      importance: Notifications.AndroidImportance.DEFAULT,
    },
  ];
}

type CategoryDef = { id: CategoryId; actions: Notifications.NotificationAction[] };

const actionTitleKeys: Record<ActionId, string> = {
  buy_again: 'notifications.actions.buyAgain',
  mark_finished: 'notifications.actions.markFinished',
  snooze: 'notifications.actions.snooze',
  done: 'notifications.actions.done',
  skip_week: 'notifications.actions.skipWeek',
};

/** Spec table "Actions". Every action runs without opening the app where the OS allows it. */
export const categoryActions: Record<CategoryId, ActionId[]> = {
  expiry_warning: ['buy_again'],
  expiry_day: ['mark_finished'],
  routine: ['snooze'],
  hair: ['done', 'snooze'],
  other_care: ['done'],
  weekly_photo: ['skip_week'],
};

export function categoryDefs(t: TFunction): CategoryDef[] {
  return (Object.keys(categoryActions) as CategoryId[]).map((id) => ({
    id,
    actions: categoryActions[id].map((action) => ({
      identifier: action,
      buttonTitle: t(actionTitleKeys[action]),
      options: { opensAppToForeground: false },
    })),
  }));
}

/** While the app is open: show the banner and keep it in the list, but play no sound. */
export function setForegroundBehaviour(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Registers channels and categories; calling it again with a new language renames them. */
export async function setupNotifications(t: TFunction): Promise<void> {
  setForegroundBehaviour();
  const jobs: Promise<unknown>[] = [];
  if (Platform.OS === 'android') {
    for (const c of channelDefs(t)) {
      jobs.push(
        Notifications.setNotificationChannelAsync(c.id, {
          name: c.name,
          importance: c.importance,
          sound: 'default',
          lightColor: palette.light.accent,
        }),
      );
    }
  }
  for (const c of categoryDefs(t)) {
    jobs.push(Notifications.setNotificationCategoryAsync(c.id, c.actions));
  }
  await Promise.all(jobs);
}
